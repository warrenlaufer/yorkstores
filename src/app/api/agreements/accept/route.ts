import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { AGREEMENTS_VERSION } from '@/lib/legal'

// Records that the current user has accepted the current agreements.
// Everyone accepts the general agreements (Terms + Privacy); store owners also accept the Seller Agreement.
export async function POST() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const now = new Date()
  const isSeller = user.role === 'STORE_OWNER'

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        agreementVersion: AGREEMENTS_VERSION,
        agreementAcceptedAt: now,
        ...(isSeller ? { sellerAgreementVersion: AGREEMENTS_VERSION, sellerAgreementAcceptedAt: now } : {}),
      },
    })
    await tx.agreementAcceptance.create({ data: { userId: user.id, kind: 'general', version: AGREEMENTS_VERSION } })
    if (isSeller) {
      await tx.agreementAcceptance.create({ data: { userId: user.id, kind: 'seller', version: AGREEMENTS_VERSION } })
    }
  })

  return ok({ accepted: true })
}
