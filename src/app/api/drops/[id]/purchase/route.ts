import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import { z } from 'zod'
import { sendStoreSaleNotificationEmail } from '@/lib/email'

const schema = z.object({
  dropId: z.string().min(1),
  boxId: z.string().optional(),
})

async function shuffleUnsoldBoxes(dropId: string) {
  try {
    const unsoldBoxes = await prisma.box.findMany({
      where: { dropId, sold: false },
      select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true },
    })
    if (unsoldBoxes.length <= 1) return

    const imageMap: Record<string, string | null> = {}
    unsoldBoxes.forEach(b => {
      const k = `${b.itemName}|${Number(b.itemPrice)}`
      if (!imageMap[k]) imageMap[k] = b.itemImageUrl ?? null
    })

    const identities = unsoldBoxes.map(b => ({
      itemName: b.itemName,
      itemPrice: b.itemPrice,
      itemShippingCost: b.itemShippingCost,
    }))

    for (let i = identities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[identities[i], identities[j]] = [identities[j], identities[i]]
    }

    const values = unsoldBoxes.map((b, idx) => {
      const identity = identities[idx]
      const k = `${identity.itemName}|${Number(identity.itemPrice)}`
      const img = imageMap[k]
      return `('${b.id}', '${identity.itemName.replace(/'/g, "''")}', ${Number(identity.itemPrice)}, ${Number(identity.itemShippingCost)}, ${img ? `'${img.replace(/'/g, "''")}'` : 'NULL'})`
    }).join(',')

    await prisma.$executeRawUnsafe(`
      UPDATE "Box" AS b SET
        "itemName" = v."itemName",
        "itemPrice" = v."itemPrice"::numeric,
        "itemShippingCost" = v."itemShippingCost"::numeric,
        "itemImageUrl" = v."itemImageUrl"
      FROM (VALUES ${values}) AS v(id, "itemName", "itemPrice", "itemShippingCost", "itemImageUrl")
      WHERE b.id = v.id
    `)
  } catch (e) {
    console.error('Shuffle failed:', e)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse({ dropId: params.id, ...body })
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { dropId, boxId } = parsed.data

  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    include: { owner: true },
  })

  if (!drop || !drop.isActive) return err('Drop not found or inactive')

  const cashBalance = Number(user.cashBalance)
  const promoBalance = Number(user.promoBalance)
  const totalBalance = cashBalance + promoBalance

  try {
    const result = await prisma.$transaction(async tx => {
      const unsoldBoxes = await tx.$queryRawUnsafe<Array<{
        id: string; itemName: string; itemPrice: number;
        itemShippingCost: number; itemImageUrl: string | null;
      }>>(
        `SELECT id, "itemName", "itemPrice"::float, "itemShippingCost"::float, "itemImageUrl"
         FROM "Box"
         WHERE "dropId" = $1 AND sold = false
         FOR UPDATE SKIP LOCKED`,
        dropId
      )

      if (!unsoldBoxes.length) throw new Error('NO_BOXES')

      const box = boxId
        ? unsoldBoxes.find(b => b.id === boxId)
        : unsoldBoxes[Math.floor(Math.random() * unsoldBoxes.length)]

      if (!box) throw new Error('NO_BOXES')

      const allBoxes = await tx.box.findMany({
        where: { dropId },
        select: { itemPrice: true, sold: true },
      })

      const allPrices = allBoxes.map(b => Number(b.itemPrice))
      const unsoldPrices = unsoldBoxes.map(b => Number(b.itemPrice))
      const boxPrice = calcBoxPriceForDrop(allPrices, unsoldPrices, drop.pricingType)

      if (totalBalance < boxPrice) throw new Error('INSUFFICIENT_BALANCE')

      const platformFee = Math.round(boxPrice * 0.05 * 100) / 100
      const storeCredit = Math.round(boxPrice * 0.95 * 100) / 100
      const reservedAmt = Math.round(box.itemPrice * (drop.sellBackPct / 100) * 100) / 100
      const now = new Date()

      // Spend promo balance first, then cash
      // Split 50/50 between promo and cash where possible. If one side is short of its
      // half, use what's there and cover the remainder from the other side.
      const half = Math.round((boxPrice / 2) * 100) / 100
      let promoSpend: number
      let cashSpend: number
      if (promoBalance >= half && cashBalance >= half) {
        promoSpend = half
        cashSpend = Math.round((boxPrice - half) * 100) / 100
      } else if (promoBalance < half) {
        promoSpend = Math.round(promoBalance * 100) / 100
        cashSpend = Math.round((boxPrice - promoSpend) * 100) / 100
      } else {
        cashSpend = Math.round(cashBalance * 100) / 100
        promoSpend = Math.round((boxPrice - cashSpend) * 100) / 100
      }

      await tx.box.update({ where: { id: box.id }, data: { sold: true } })
      await tx.user.update({
        where: { id: user.id },
        data: {
          walletBalance: { decrement: boxPrice },
          cashBalance: { decrement: cashSpend },
          promoBalance: { decrement: promoSpend },
        },
      })
      await tx.user.update({ where: { id: drop.ownerId }, data: { storeBalance: { increment: storeCredit } } })

      const p = await tx.purchase.upsert({
        where: { boxId: box.id },
        create: { buyerId: user.id, boxId: box.id, dropId, pricePaid: boxPrice, promoPaid: promoSpend, cashPaid: cashSpend, reservedAmt, revealedAt: now },
        update: { buyerId: user.id, pricePaid: boxPrice, promoPaid: promoSpend, cashPaid: cashSpend, reservedAmt, outcome: null, refundAmt: 0, resolvedAt: null, revealedAt: now },
      })

      await tx.transaction.createMany({
        data: [
          { userId: user.id, dropId, type: 'purchase', description: `Opened box: ${drop.name}`, amount: -boxPrice },
          { userId: drop.ownerId, dropId, type: 'sale', description: `Sale: ${drop.name}`, amount: storeCredit },
        ],
      })

      await tx.platformTransaction.create({
        data: { type: 'platform_fee', description: `Platform fee: ${drop.name}`, amount: platformFee, dropId },
      })

      return { purchase: p, box, boxPrice, cashBalance, promoBalance, cashSpend, promoSpend }
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000,
    })

    shuffleUnsoldBoxes(dropId)

    try {
      const storeCredit = Math.round(result.boxPrice * 0.95 * 100) / 100
      await sendStoreSaleNotificationEmail(drop.owner.email, drop.owner.name, {
        dropName: drop.name,
        itemName: result.box.itemName,
        salePrice: result.boxPrice,
        earned: storeCredit,
      })
    } catch (e) {
      console.error('Store sale notification email failed:', e)
    }

    return ok({
      purchaseId: result.purchase.id,
      revealedAt: result.purchase.revealedAt?.toISOString() ?? new Date().toISOString(),
      box: {
        itemName: result.box.itemName,
        itemPrice: Number(result.box.itemPrice),
        itemShippingCost: Number(result.box.itemShippingCost),
        itemImageUrl: result.box.itemImageUrl,
      },
      pricePaid: result.boxPrice,
      newBalance: totalBalance - result.boxPrice,
      newCashBalance: result.cashBalance - result.cashSpend,
      newPromoBalance: result.promoBalance - result.promoSpend,
    }, 201)

  } catch (e: any) {
    if (e.message === 'NO_BOXES') return err('No boxes available — someone else just bought the last one!')
    if (e.message === 'INSUFFICIENT_BALANCE') return err('Insufficient wallet balance')
    console.error('Purchase error:', e)
    return err('Purchase failed — please try again')
  }
}