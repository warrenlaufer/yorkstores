'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './StoreOwnerClient.module.css'

type BoxDef = { itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl: string; qty: number; _id: string }
type Tx = { id: string; type: string; description: string; amount: number; createdAt: string }

export default function StoreOwnerClient({ user, transactions }: {
  user: { id: string; name: string; email: string; company: string; storeBalance: number }
  transactions: Tx[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [boxes, setBoxes] = useState<BoxDef[]>([])
  const [iName, setIName] = useState('')
  const [iPrice, setIPrice] = useState('')
  const [iShip, setIShip] = useState('')
  const [iImg, setIImg] = useState('')
  const [iQty, setIQty] = useState('1')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
  if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }

  setLogoUploading(true)
  setError('')

  try {
    const res = await fetch('/api/users/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mimeType: file.type }),
    })
    const data = await res.json()
    console.log('Upload URL response:', data)

    if (!res.ok) {
      setError('Upload failed: ' + (data.error || 'Unknown error'))
      setLogoUploading(false)
      return
    }

    const uploadRes = await fetch(data.data.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })

    console.log('PUT response status:', uploadRes.status)

    if (!uploadRes.ok) {
      setError('Failed to upload image. Please try again.')
      setLogoUploading(false)
      return
    }

    setLogoUrl(data.data.publicUrl)
    setLogoPreview(data.data.publicUrl)
  } catch (e: any) {
    console.error('Upload error:', e)
    setError('Upload failed: ' + e.message)
  } finally {
    setLogoUploading(false)
  }
}

  function addBox() {
    const price = parseFloat(iPrice)
    if (!iName || isNaN(price) || price <= 0) { setError('Enter a valid item name and price.'); return }
    setBoxes(prev => [...prev, {
      itemName: iName, itemPrice: price, itemShippingCost: parseFloat(iShip) || 0,
      itemImageUrl: iImg, qty: Math.max(1, parseInt(iQty) || 1), _id: Math.random().toString(36).slice(2),
    }])
    setIName(''); setIPrice(''); setIShip(''); setIImg(''); setIQty('1')
    setError('')
  }

  function removeBox(id: string) { setBoxes(prev => prev.filter(b => b._id !== id)) }

  const avgVal = boxes.length ? boxes.reduce((s, b) => s + b.itemPrice * b.qty, 0) / boxes.reduce((s, b) => s + b.qty, 0) : 0
  const boxPrice = Math.round(avgVal * 1.05)
  const totalBoxes = boxes.reduce((s, b) => s + b.qty, 0)

  async function publish() {
    if (!name) { setError('Give your drop a name.'); return }
    if (!boxes.length) { setError('Add at least one item.'); return }
    if (totalBoxes < 2) { setError('Add at least 2 boxes total.'); return }
    setPublishing(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl: logoUrl || null, emoji: '📦', boxes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Drop published!')
      setName(''); setLogoUrl(''); setLogoPreview(''); setBoxes([])
      setTimeout(() => { setSuccess(''); router.refresh() }, 1500)
    } catch { setError('Something went wrong.') }
    finally { setPublishing(false) }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Store Owner Dashboard</h1>
        <p className={styles.sub}>Box price = average item value +5%, rounded to nearest dollar.</p>
      </div>

      <div className={styles.grid}>
        <div>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Drop Info</div>
            <div className="field">
              <label>Drop Name</label>
              <input value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* Logo upload */}
            <div className="field">
              <label>Drop Logo</label>
              <div className={styles.logoUploadArea} onClick={() => logoInputRef.current?.click()}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className={styles.logoPreview} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    {logoUploading ? (
                      <><span className="spin" style={{width:20,height:20}} /><span>Uploading…</span></>
                    ) : (
                      <><span style={{fontSize:'1.5rem'}}>🖼️</span><span>Click to upload logo</span><span className={styles.logoHint}>PNG, JPG or SVG · Max 5MB</span></>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              {logoPreview && (
                <button
                  className={styles.removeLogoBtn}
                  onClick={() => { setLogoUrl(''); setLogoPreview('') }}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          <div className={styles.panel} style={{marginTop:'0.75rem'}}>
            <div className={styles.panelTitle}>Add Items</div>
            <div className={styles.itemGrid}>
              <div><label>Name</label><input value={iName} onChange={e => setIName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addBox()} /></div>
              <div><label>Value $</label><input type="number" value={iPrice} onChange={e => setIPrice(e.target.value)} min="0.01" /></div>
              <div><label>Ship $</label><input type="number" value={iShip} onChange={e => setIShip(e.target.value)} min="0" /></div>
              <div><label>Qty</label><input type="number" value={iQty} onChange={e => setIQty(e.target.value)} min="1" max="50" /></div>
            </div>
            <div className="field"><label>Image URL (optional)</label><input value={iImg} onChange={e => setIImg(e.target.value)} /></div>
            <button className={styles.addBtn} onClick={addBox}>+ Add Item</button>
            <div className={styles.itemList}>
              {boxes.map(b => (
                <div key={b._id} className={styles.itemRow}>
                  <span className={styles.itemName}>{b.itemName}{b.qty > 1 ? ` ×${b.qty}` : ''}</span>
                  <span className={styles.itemPrice}>${b.itemPrice}</span>
                  <span className={styles.itemShip}>+${b.itemShippingCost.toFixed(2)} ship</span>
                  <button className={styles.removeBtn} onClick={() => removeBox(b._id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Drop Preview</div>
            {boxes.length > 0 ? (
              <div className={styles.preview}>
                <div className={styles.previewRow}><span>Drop</span><span>{name || 'Unnamed Drop'}</span></div>
                <div className={styles.previewRow}><span>Owner</span><span>{user.company}</span></div>
                <div className={styles.previewRow}><span>Boxes</span><span>{totalBoxes}</span></div>
                <div className={styles.previewRow}><span>Avg value</span><span>${avgVal.toFixed(2)}</span></div>
                <div className={styles.previewRow}><span>Box price (avg +5%)</span><span style={{color:'#F5C842'}}>${boxPrice}</span></div>
                <div className={styles.previewRow}><span>Your revenue (90%)</span><span style={{color:'#3DD68C'}}>${(boxPrice * totalBoxes * 0.9).toFixed(2)}</span></div>
              </div>
            ) : (
              <p className={styles.previewEmpty}>Add items to preview…</p>
            )}
            {error && <div className={styles.errBox}>{error}</div>}
            {success && <div className={styles.successBox}>{success}</div>}
            <button className={styles.publishBtn} onClick={publish} disabled={publishing}>
              {publishing ? <span className="spin" /> : 'Publish Drop'}
            </button>
          </div>

          <div className={styles.panel} style={{marginTop:'0.75rem'}}>
            <div className={styles.panelTitle}>Store Wallet</div>
            <div className={styles.storeBalance}>${user.storeBalance.toFixed(2)}</div>
            <p className={styles.storeBalanceSub}>Funded from box sales (90%). Covers buybacks.</p>
            {transactions.length === 0 ? (
              <p className={styles.txEmpty}>No transactions yet.</p>
            ) : (
              <div className={styles.txList}>
                {transactions.map(t => (
                  <div key={t.id} className={styles.txRow}>
                    <span className={styles.txDesc}>{t.description}</span>
                    <span className={`${styles.txAmt} ${t.amount >= 0 ? styles.txPos : styles.txNeg}`}>
                      {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}