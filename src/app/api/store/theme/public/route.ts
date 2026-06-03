import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { prisma } from '@/lib/prisma'

const DEFAULT_THEME = {
  primaryColor: '#FF6B85',
  backgroundColor: '#08080B',
  cardColor: '#0F0F14',
  textColor: '#EEEEF5',
  accentColor: '#F5C842',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ownerId = searchParams.get('ownerId')
  if (!ownerId) return ok(DEFAULT_THEME)

  const theme = await prisma.storeTheme.findUnique({ where: { userId: ownerId } })
  return ok(theme ?? DEFAULT_THEME)
}