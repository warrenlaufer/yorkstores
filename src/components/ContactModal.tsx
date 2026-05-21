'use client'
import { useState } from 'react'
import styles from './ContactModal.module.css'

export default function ContactModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit() {
    if (!name.trim() || !email.trim() || !message.trim()) { setError('Please fill in all fields.'); return }
    if (message.length < 10) { setError('Message must be at least 10 characters.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setSuccess(true)
      setName(''); setEmail(''); setMessage('')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function close() {
    setOpen(false)
    setSuccess(false)
    setError('')
  }

  return (
    <>
      {/* Floating button */}
      <button className={styles.fab} onClick={() => setOpen(true)}>
        Contact Us
      </button>

      {/* Modal */}
      {open && (
        <div className={styles.overlay} onClick={close}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Contact Us</h2>
              <button className={styles.closeBtn} onClick={close}>✕</button>
            </div>

            {success ? (
              <div className={styles.successWrap}>
                <div className={styles.successIcon}>✅</div>
                <h3 className={styles.successTitle}>Message sent!</h3>
                <p className={styles.successSub}>We'll get back to you as soon as possible.</p>
                <button className={styles.doneBtn} onClick={close}>Close</button>
              </div>
            ) : (
              <>
                <p className={styles.modalSub}>Have a question or need help? Send us a message.</p>
                {error && <div className={styles.errBox}>{error}</div>}
                <div className="field">
                  <label>Your Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" />
                </div>
                <div className="field">
                  <label>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="field">
                  <label>Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    rows={5}
                    style={{
                      width: '100%',
                      background: '#1D1D26',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontFamily: 'var(--font)',
                      fontSize: '0.85rem',
                      padding: '0.55rem 0.8rem',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button className={styles.submitBtn} onClick={submit} disabled={loading}>
                  {loading ? <span className="spin" /> : 'Send Message'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}