import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { LEGAL_DOCS, LEGAL_LABELS, AGREEMENTS_VERSION, AGREEMENTS_EFFECTIVE } from '@/lib/legal'

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map(doc => ({ doc }))
}

export function generateMetadata({ params }: { params: { doc: string } }): Metadata {
  const label = LEGAL_LABELS[params.doc]
  return { title: label ? `${label} · Yorkstores` : 'Yorkstores' }
}

function renderInline(text: string, keyBase: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyBase}-${i}`} style={{ color: '#fff' }}>{part}</strong> : <span key={`${keyBase}-${i}`}>{part}</span>
  )
}

export default function LegalDocPage({ params }: { params: { doc: string } }) {
  const doc = LEGAL_DOCS[params.doc]
  if (!doc) notFound()

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.25rem 5rem', color: 'var(--text2)' }}>
      <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' }}>{doc.title}</h1>
      <p style={{ fontSize: '0.78rem', color: 'var(--text3)', margin: '0 0 2rem' }}>
        Version {AGREEMENTS_VERSION} · Effective {AGREEMENTS_EFFECTIVE}
      </p>
      {doc.sections.map((section, si) => (
        <section key={si} style={{ marginBottom: section.heading ? '1.5rem' : '1rem' }}>
          {section.heading && (
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: '1.5rem 0 0.6rem' }}>{section.heading}</h2>
          )}
          {section.paragraphs.map((p, pi) => (
            <p key={pi} style={{ fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 0.85rem' }}>{renderInline(p, `${si}-${pi}`)}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
