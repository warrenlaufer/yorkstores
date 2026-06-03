'use client'
import { useState } from 'react'
import Link from 'next/link'

type Theme = {
  primaryColor: string
  backgroundColor: string
  cardColor: string
  textColor: string
  accentColor: string
}

type Drop = {
  id: string
  name: string
  isActive: boolean
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a)
  const l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function readable(bg: string): string {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000') ? '#ffffff' : '#000000'
}

function contrastOk(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5
}

const FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'backgroundColor', label: 'Background', hint: 'Main page background' },
  { key: 'cardColor', label: 'Card Background', hint: 'Box and card surfaces' },
  { key: 'primaryColor', label: 'Primary Color', hint: 'Buttons and highlights' },
  { key: 'accentColor', label: 'Accent Color', hint: 'Prices and key numbers' },
  { key: 'textColor', label: 'Text Color', hint: 'Main text color' },
]

export default function ThemeClient({
  initial, drops, ownerId,
}: {
  initial: Theme
  drops: Drop[]
  ownerId: string
}) {
  const [theme, setTheme] = useState<Theme>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [selectedDropId, setSelectedDropId] = useState(drops[0]?.id ?? '')
  const [copied, setCopied] = useState(false)

  function update(key: keyof Theme, value: string) {
    setTheme(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function reset() {
    setTheme({
      primaryColor: '#FF6B85',
      backgroundColor: '#08080B',
      cardColor: '#0F0F14',
      textColor: '#EEEEF5',
      accentColor: '#F5C842',
    })
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/store/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError('Something went wrong.') }
    finally { setSaving(false) }
  }

  function copyEmbed() {
    if (!selectedDropId) return
    const code = `<iframe src="https://www.yorkstores.com/embed/drop/${selectedDropId}" width="100%" height="700" frameborder="0" style="border-radius:12px;"></iframe>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const warnings: string[] = []
  if (!contrastOk(theme.textColor, theme.backgroundColor)) warnings.push('Text vs Background contrast is too low')
  if (!contrastOk(readable(theme.primaryColor), theme.primaryColor)) warnings.push('Button text vs Primary Color contrast is too low')
  if (!contrastOk(theme.textColor, theme.cardColor)) warnings.push('Text vs Card Background contrast is too low')

  const selectedDrop = drops.find(d => d.id === selectedDropId)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font, system-ui)', color: '#EEEEF5' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link href="/dashboard/store" style={{ fontSize: '0.72rem', color: '#9898B0', textDecoration: 'none', display: 'inline-block', marginBottom: '0.4rem' }}>← Back to Store</Link>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>Embed Theme</h1>
          <p style={{ fontSize: '0.78rem', color: '#9898B0' }}>Customize how your drops look when embedded on your site.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={reset} style={{ background: 'transparent', color: '#9898B0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.75rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer' }}>Reset</button>
          <button onClick={save} disabled={saving} style={{ background: saved ? '#3DD68C' : '#FF6B85', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.75rem', fontWeight: 800, padding: '0.4rem 0.9rem', cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.2s' }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Theme'}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div style={{ background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F5C842', marginBottom: '0.3rem' }}>⚠️ Contrast Warnings</div>
          {warnings.map(w => <div key={w} style={{ fontSize: '0.68rem', color: '#F5C842' }}>· {w}</div>)}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(255,107,133,0.12)', border: '1px solid rgba(255,107,133,0.3)', color: '#FF8FA3', fontSize: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,300px) 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#FF8FA3', marginBottom: '1rem' }}>Colors</div>
            {FIELDS.map(f => (
              <div key={f.key} style={{ marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EEEEF5' }}>{f.label}</label>
                  <span style={{ fontSize: '0.62rem', color: '#9898B0', fontFamily: 'monospace' }}>{theme[f.key]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={theme[f.key]}
                    onChange={e => update(f.key, e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'transparent' }}
                  />
                  <input
                    type="text"
                    value={theme[f.key]}
                    onChange={e => {
                      const v = e.target.value
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) update(f.key, v)
                    }}
                    style={{ flex: 1, background: '#1D1D26', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'monospace', fontSize: '0.78rem', padding: '0.35rem 0.5rem', borderRadius: 6, outline: 'none' }}
                  />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#9898B0', marginTop: '0.2rem' }}>{f.hint}</div>
              </div>
            ))}
          </div>

          {/* Embed code */}
          <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#FF8FA3', marginBottom: '0.75rem' }}>Embed Code</div>
            {drops.length === 0 ? (
              <p style={{ fontSize: '0.72rem', color: '#9898B0' }}>No drops yet. Publish a drop first.</p>
            ) : (
              <>
                <div style={{ marginBottom: '0.6rem' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9898B0', display: 'block', marginBottom: '0.3rem' }}>Select Drop</label>
                  <select
                    value={selectedDropId}
                    onChange={e => setSelectedDropId(e.target.value)}
                    style={{ width: '100%', background: '#1D1D26', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'var(--font)', fontSize: '0.78rem', padding: '0.4rem 0.5rem', borderRadius: 6, outline: 'none' }}
                  >
                    {drops.map(d => (
                      <option key={d.id} value={d.id}>{d.name}{!d.isActive ? ' (inactive)' : ''}</option>
                    ))}
                  </select>
                </div>
                {selectedDropId && (
                  <>
                    <div style={{ background: '#1D1D26', borderRadius: 8, padding: '0.6rem', fontSize: '0.62rem', fontFamily: 'monospace', color: '#9898B0', wordBreak: 'break-all' as const, lineHeight: 1.6, marginBottom: '0.5rem' }}>
                      {`<iframe src="https://www.yorkstores.com/embed/drop/${selectedDropId}" width="100%" height="700" frameborder="0" style="border-radius:12px;"></iframe>`}
                    </div>
                    <button
                      onClick={copyEmbed}
                      style={{ width: '100%', background: copied ? 'rgba(61,214,140,0.15)' : 'rgba(126,200,255,0.1)', color: copied ? '#3DD68C' : '#7EC8FF', border: `1px solid ${copied ? 'rgba(61,214,140,0.3)' : 'rgba(126,200,255,0.3)'}`, borderRadius: 6, fontFamily: 'var(--font)', fontSize: '0.72rem', fontWeight: 700, padding: '0.4rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {copied ? '✓ Copied!' : 'Copy Embed Code'}
                    </button>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                      <a href={`/embed/drop/${selectedDropId}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#9898B0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontFamily: 'var(--font)', fontSize: '0.68rem', fontWeight: 600, padding: '0.35rem', textAlign: 'center' as const, textDecoration: 'none' }}>
                        Preview Embed
                      </a>
                      <a href={`/drop/${selectedDropId}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#9898B0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontFamily: 'var(--font)', fontSize: '0.68rem', fontWeight: 600, padding: '0.35rem', textAlign: 'center' as const, textDecoration: 'none' }}>
                        Public Page
                      </a>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, overflow: 'hidden', position: 'sticky' as const, top: '5rem' }}>
          <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#FF8FA3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Live Preview</span>
            {selectedDrop && <span style={{ color: '#9898B0', fontWeight: 400, textTransform: 'none' as const, letterSpacing: 0 }}>{selectedDrop.name}</span>}
          </div>
          <div style={{ background: theme.backgroundColor, padding: '1.25rem', minHeight: 420 }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ width: 56, height: 56, background: theme.cardColor, border: `1px solid ${theme.primaryColor}44`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🎁</div>
              <div>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, color: theme.primaryColor, textTransform: 'uppercase' as const, marginBottom: 2 }}>Trading Cards</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: theme.textColor, marginBottom: 2 }}>Sample Drop</div>
                <div style={{ fontSize: '0.65rem', color: theme.textColor + '80' }}>by Your Store</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { val: '$25', lbl: 'Per Box', color: theme.accentColor },
                { val: '90%', lbl: 'Sell Back', color: '#3DD68C' },
                { val: '8', lbl: 'Remaining', color: '#7EC8FF' },
              ].map(s => (
                <div key={s.lbl} style={{ background: theme.cardColor, border: `1px solid ${theme.primaryColor}22`, borderRadius: 8, padding: '0.35rem 0.6rem', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.5rem', color: theme.textColor + '80', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 4, background: theme.cardColor, borderRadius: 2, overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ height: '100%', width: '40%', background: theme.primaryColor, borderRadius: 2 }} />
            </div>
            <div style={{ background: theme.cardColor, border: `1px solid ${theme.primaryColor}44`, borderRadius: 10, padding: '1rem', marginBottom: '1rem', textAlign: 'center' as const }}>
              <p style={{ fontSize: '0.7rem', color: theme.textColor + '99', marginBottom: '0.75rem' }}>Create a free account to open a box.</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <div style={{ background: theme.primaryColor, color: readable(theme.primaryColor), borderRadius: 8, padding: '0.5rem 1.1rem', fontWeight: 800, fontSize: '0.8rem' }}>Open a Box — $25</div>
                <div style={{ background: 'transparent', color: theme.textColor, border: `1px solid ${theme.textColor}33`, borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.8rem' }}>Sign In</div>
              </div>
            </div>
            {[
              { name: 'Sample Card PSA 10', price: 150, pct: '60.0' },
              { name: 'Another Item', price: 50, pct: '40.0' },
            ].map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: theme.cardColor, border: `1px solid ${theme.primaryColor}22`, borderRadius: 8, padding: '0.45rem 0.65rem', marginBottom: '0.35rem' }}>
                <div style={{ width: 32, height: 32, background: theme.backgroundColor, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🎴</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: theme.textColor }}>{item.name}</div>
                  <div style={{ fontSize: '0.6rem', color: theme.textColor + '80' }}>${item.price} value</div>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: theme.accentColor }}>{item.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}