import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'

// Admin-only: the durable history of cron executions. Visit while logged in as an admin:
//   /api/admin/cron-runs           -> last 50 runs across all jobs
//   /api/admin/cron-runs?job=refresh-prices
// If the list is empty or the newest `createdAt` is stale versus the schedule, the job isn't
// firing. If runs appear on cadence with status "ok", it's working.
export async function GET(req: Request) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const url = new URL(req.url)
  const job = url.searchParams.get('job') || undefined
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)

  const runs = await prisma.cronRun.findMany({
    where: job ? { job } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Quick health summary per job: last run time + how long ago, and the last status.
  const byJob: Record<string, { lastRun: string; minutesAgo: number; lastStatus: string; lastScanned: number; lastUpdated: number }> = {}
  for (const r of runs) {
    if (byJob[r.job]) continue // runs are newest-first, so the first seen is the latest
    byJob[r.job] = {
      lastRun: r.createdAt.toISOString(),
      minutesAgo: Math.round((Date.now() - r.createdAt.getTime()) / 60000),
      lastStatus: r.status,
      lastScanned: r.scanned,
      lastUpdated: r.updated,
    }
  }

  return ok({
    now: new Date().toISOString(),
    summary: byJob,
    count: runs.length,
    runs: runs.map(r => ({
      job: r.job,
      status: r.status,
      scanned: r.scanned,
      updated: r.updated,
      durationMs: r.durationMs,
      detail: r.detail,
      at: r.createdAt.toISOString(),
    })),
  })
}
