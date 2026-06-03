import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import ThemeClient from './ThemeClient'

export const dynamic = 'force-dynamic'

export default async function ThemePage() {
  const user = await getSession()
  if (!user) redirect('/signin')
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) redirect('/dashboard')

  const theme = await prisma.storeTheme.findUnique({ where: { userId: user.id } })

  const drops = await prisma.drop.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <ThemeClient
      initial={{
        primaryColor: theme?.primaryColor ?? '#FF6B85',
        backgroundColor: theme?.backgroundColor ?? '#08080B',
        cardColor: theme?.cardColor ?? '#0F0F14',
        textColor: theme?.textColor ?? '#EEEEF5',
        accentColor: theme?.accentColor ?? '#F5C842',
      }}
      drops={drops}
      ownerId={user.id}
    />
  )
}