import { getSession, verifyPassword, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { changePasswordSchema } from '@/lib/schemas'

export async function POST(req: Request) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0]?.message || 'Invalid input')

  const { currentPassword, password } = parsed.data

  const valid = await verifyPassword(user.passwordHash, currentPassword)
  if (!valid) return err('Your current password is incorrect.')
  if (currentPassword === password) return err('Your new password must be different from your current password.')

  const passwordHash = await hashPassword(password)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return ok({ changed: true })
}
