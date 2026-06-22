import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'

const GRADERS = ['psa', 'bgs', 'sgc', 'cgc']

// Turn a GemRate grade code (e.g. "g10", "g9.5", "a10") into a display grade ("10", "9.5").
function formatGrade(g: unknown): string {
  if (typeof g !== 'string' || !g) return ''
  const m = g.match(/^[a-z]*(\d+(?:\.\d+)?)$/i)
  return m ? m[1] : g.toUpperCase()
}

// The cert-images response shape isn't documented, so find the first image-like URL,
// preferring keys that look like a front image. Works regardless of exact field names.
function findImageUrl(obj: any, keyHint = ''): string | null {
  if (typeof obj === 'string') {
    if (!/^https?:\/\//i.test(obj)) return null
    const looksImage = /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(obj) || /front|image|img|photo/i.test(keyHint)
    return looksImage ? obj : null
  }
  if (Array.isArray(obj)) {
    for (const v of obj) { const r = findImageUrl(v, keyHint); if (r) return r }
    return null
  }
  if (obj && typeof obj === 'object') {
    const keys = Object.keys(obj)
    const ordered = [
      ...keys.filter(k => /front/i.test(k)),
      ...keys.filter(k => /(image|img|photo|url)/i.test(k) && !/front/i.test(k)),
      ...keys,
    ]
    for (const k of ordered) { const r = findImageUrl(obj[k], k); if (r) return r }
    return null
  }
  return null
}

export async function POST(req: Request) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const grader = String(body?.grader || '').toLowerCase().trim()
  const cert = String(body?.cert || '').trim()
  if (!GRADERS.includes(grader)) return err('Select a valid grader (PSA, Beckett, SGC, or CGC).')
  if (!cert) return err('Enter a cert number.')

  const apiKey = process.env.GEMRATE_API_KEY
  if (!apiKey) return err('Cert lookup is not configured.', 500)
  const base = process.env.GEMRATE_API_BASE || 'https://api.gemrate.com'

  try {
    const res = await fetch(`${base}/cert-lookup`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({ grader, cert }),
    })

    if (res.status === 429) return err('Cert lookup is rate-limiting requests right now. Please wait a moment and try again.', 429)
    if (res.status === 401 || res.status === 403) return err('Cert lookup rejected the request — check the API key.', 502)
    if (res.status === 404) return err('No record found for that grader and cert number.')
    if (!res.ok) return err(`Cert lookup failed (HTTP ${res.status}). Please try again shortly.`, 502)

    const data = await res.json().catch(() => null)
    if (!data || !data.description) return err('No card details found for that cert number.')

    const graderLabel = grader.toUpperCase()
    const gradeDisplay = formatGrade(data.grade)
    const itemName = `${data.description}${graderLabel || gradeDisplay ? ` (${[graderLabel, gradeDisplay].filter(Boolean).join(' ')})` : ''}`

    const gemRatePct = data.gem_rate != null && !isNaN(parseFloat(data.gem_rate))
      ? Math.round(parseFloat(data.gem_rate) * 1000) / 10
      : null

    // Slab image comes from a separate endpoint; non-fatal if it fails or is empty.
    let imageUrl: string | null = null
    try {
      const imgRes = await fetch(`${base}/cert-images`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify({ grader, cert }),
      })
      if (imgRes.ok) imageUrl = findImageUrl(await imgRes.json().catch(() => null))
    } catch { /* image is optional */ }

    return ok({
      itemName,
      description: data.description as string,
      grader: graderLabel,
      grade: gradeDisplay,
      gemRate: gemRatePct,            // percentage, e.g. 50.5
      gradePopulation: data.grade_population ?? null,
      populationHigher: data.population_higher ?? null,
      totalPopulation: data.total_population ?? null,
      setUrl: data.set_url ?? null,
      gemrateId: data.gemrate_id ?? null,
      imageUrl,
    })
  } catch {
    return err('Failed to reach the cert lookup service. Please try again.')
  }
}
