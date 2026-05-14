import { PrismaClient, Role } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminHash = await argon2.hash('admin1234')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@yorkstores.com' },
    update: {},
    create: {
      email: 'admin@yorkstores.com',
      name: 'Platform Admin',
      role: Role.ADMIN,
      passwordHash: adminHash,
      emailVerified: true,
      walletBalance: 0,
      storeBalance: 0,
    },
  })
  console.log('Created admin:', admin.email)

  const ownerHash = await argon2.hash('password123')
  const owner = await prisma.user.upsert({
    where: { email: 'gadgetvault@example.com' },
    update: {},
    create: {
      email: 'gadgetvault@example.com',
      name: 'Gadget Vault',
      role: Role.STORE_OWNER,
      company: 'Gadget Vault Co.',
      passwordHash: ownerHash,
      emailVerified: true,
      walletBalance: 200,
      storeBalance: 200,
    },
  })
  console.log('Created store owner:', owner.email)

  const buyerHash = await argon2.hash('password123')
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      email: 'buyer@example.com',
      name: 'Jane Smith',
      role: Role.BUYER,
      passwordHash: buyerHash,
      emailVerified: true,
      walletBalance: 500,
    },
  })
  console.log('Created buyer:', buyer.email)

  const existingDrop = await prisma.drop.findFirst({ where: { ownerId: owner.id } })
  if (!existingDrop) {
    const drop = await prisma.drop.create({
      data: {
        name: 'Tech Essentials',
        emoji: '💻',
        ownerId: owner.id,
        boxes: {
          create: [
            { itemName: 'AirPods Pro', itemPrice: 249, itemShippingCost: 9.99 },
            { itemName: 'Apple Watch SE', itemPrice: 199, itemShippingCost: 9.99 },
            { itemName: 'Kindle', itemPrice: 140, itemShippingCost: 6.99 },
            { itemName: 'Mechanical Keyboard', itemPrice: 90, itemShippingCost: 7.99 },
            { itemName: 'USB-C Hub', itemPrice: 50, itemShippingCost: 4.99 },
          ],
        },
      },
    })
    console.log('Created drop:', drop.name)

    const drop2 = await prisma.drop.create({
      data: {
        name: 'Streetwear Drop',
        emoji: '👟',
        ownerId: owner.id,
        boxes: {
          create: [
            { itemName: 'Nike Dunk Low', itemPrice: 180, itemShippingCost: 12.99 },
            { itemName: 'Supreme Cap', itemPrice: 120, itemShippingCost: 5.99 },
            { itemName: 'Carhartt Beanie', itemPrice: 45, itemShippingCost: 3.99 },
            { itemName: 'Crewneck Sweatshirt', itemPrice: 35, itemShippingCost: 6.99 },
          ],
        },
      },
    })
    console.log('Created drop:', drop2.name)
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
