'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './StoreOwnerClient.module.css'

type BoxDef = { itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl: string; qty: number; _id: string }
type Tx = { id: string; type: string; description: string; amount: number; createdAt: string }
type DropSummary = { id: string; name: string; logoUrl?: string; isActive: boolean; totalBoxes: number; soldBoxes: number }

export default function StoreOwnerClient({ user, transactions, drops }: {
  user: { id: string; name: string; email: string; company: string; storeBalance: number }
  transactions: Tx[]
  drops: DropSummary[]
}) {
  const router = useRouter()

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [sellBackPct, setSellBackPct] = useState('90')
  const [boxes, setBoxes] = useState<BoxDef[]>([])
  const [iName, setIName] = useState('')
  const [iPrice, setIPrice] = useState('')
  const [iShip, setIShip] = useState('')
  const [iImg, setIImg] = useState('')
  const [iImgPreview, setIImgPreview] = useState('')
  const [iImgUploading, setIImgUploading] = useState(false)
  const [iQty, setIQty] = useState('1')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)
  const itemImgInputRef = useRef<HTMLInputElement>(null)

  const [editingDrop, setEditingDrop] = useState<DropSummary | null>(null)
  const [editName, setEditName] = useState('')
  const [editLogoUrl, setEditLogoUrl] = useState('')
  const [editLogoPreview, setEditLogoPreview] = useState('')
  const [editLogoUploading, setEditLogoUploading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const editLogoInputRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/users/upload-url', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data.data.publicUrl
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setLogoUploading(true); setError('')
    try {
      const url = await uploadImage(file)
      setLogoUrl(url); setLogoPreview(url)
    } catch (e: any) { setError('Logo upload failed: ' + e.message) }
    finally { setLogoUploading(false) }
  }

  async function handleItemImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setIImgUploading(true); setError('')
    try {
      const url = await uploadImage(file)
      setIImg(url); setIImgPreview(url)
    } catch (e: any) { setError('Image upload failed: ' + e.message) }
    finally { setIImgUploading(false) }
  }

  async function handleEditLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setEditError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setEditError('Image must be under 5MB.'); return }
    setEditLogoUploading(true); setEditError('')
    try {
      const url = await uploadImage(file)
      setEditLogoUrl(url); setEditLogoPreview(url)
    } catch (e: any) { setEditError('Logo upload failed: ' + e.message) }
    finally { setEditLogoUploading(false) }
  }

  function openEdit(drop: DropSummary) {
    setEditingDrop(drop)
    setEditName(drop.name)
    setEditLogoUrl(drop.logoUrl ?? '')
    setEditLogoPreview(drop.logoUrl ?? '')
    setEditError('')
  }

  async function saveEdit() {
    if (!editingDrop) return
    if (!editName.trim()) { setEditError('Drop name is required.'); return }
    setEditSaving(true); setEditError('')
    try {
      const res = await fetch(`/api/drops/${editingDrop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, logoUrl: editLogoUrl || null }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error); return }
      setEditingDrop(null)
      router.refresh()
    } catch { setEditError('Something went wrong.') }
    finally { setEditSaving(false) }
  }

  async function toggleActive(drop: DropSummary) {
    await fetch(`/api/drops/${drop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !drop.isActive }),
    })
    router.refresh()
  }

  function addBox() {
    const price = parseFloat(iPrice)
    if (!iName || isNaN(price) || price <= 0) { setError('Enter a valid item name and price.'); return }
    setBoxes(prev => [...prev, {
      itemName: iName, itemPrice: price, itemShippingCost: parseFloat(iShip) || 0,
      itemImageUrl: iImg, qty: Math.max(1, parseInt(iQty) || 1), _id: Math.random().toString(36).slice(2),
    }])
    setIName(''); setIPrice(''); setIShip(''); setIImg(''); setIImgPreview(''); setIQty('1')
    setError('')
  }

  function removeBox(id: string) { setBoxes(prev => prev.filter(b => b._id !== id)) }

  const avgVal = boxes.length ? boxes.reduce((s, b) => s + b.itemPrice * b.qty, 0) / boxes.reduce((s, b) => s + b.qty, 0) : 0
  const boxPrice = Math.round(avgVal * 1.05)
  const totalBoxes = boxes.reduce((s, b) => s + b.qty, 0)
  const sellBackNum = Math.min(100, Math.max(0, parseInt(sellBackPct) || 90))

  async function publish() {
    if (!name) { setError('Give your drop a name.'); return }
    if (!boxes.length) { setError('Add at least one item.'); return }
    if (totalBoxes < 2) { setError('Add at least 2 boxes total.'); return }
    setPublishing(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl: logoUrl || null, emoji: '🎁', sellBackPct: sellBackNum, boxes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Drop published!')
      setName(''); setLogoUrl(''); setLogoPreview(''); setSellBackPct('90'); setBoxes([])
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

      {drops.length > 0 && (
        <div className={styles.panel} style={{marginBottom:'0.75rem'}}>
          <div className={styles.panelTitle}>Your Drops</div>
          {drops.map(d => (
            <div key={d.id} className={styles.dropRow}>
              {d.logoUrl && <img src={d.logoUrl} alt={d.name} className={styles.dropRowLogo} />}
              <div className={styles.dropRowInfo}>
                <div className={styles.dropRowName}>{d.name}</div>
                <div className={styles.dropRowMeta}>{d.soldBoxes} / {d.totalBoxes} sold · {d.isActive ? 'Active' : 'Inactive'}</div>
              </div>
              <div className={styles.dropRowActions}>
                <button className={styles.editBtn} onClick={() => openEdit(d)}>Edit</button>
                <button className={d.isActive ? styles.deactivateBtn : styles.activateBtn} onClick={() => toggleActive(d)}>
                  {d.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        <div>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>New Drop</div>
            <div className="field">
              <label>Drop Name</label>
              <input value={name} onChange={e => setName(e.target.value)} />
            </div>
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
                      <><span style={{fontSize:'1.5rem'}}>🖼️</span><span>Click to upload logo</span><span className={styles.logoHint}>PNG, JPG or WebP · Max 5MB</span></>
                    )}
                  </div>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoUpload} />
              {logoPreview && <button className={styles.removeLogoBtn} onClick={() => { setLogoUrl(''); setLogoPreview('') }}>Remove logo</button>}
            </div>
            <div className="field">
              <label>Buy-Back Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                value={sellBackPct}
                onChange={e => setSellBackPct(e.target.value)}
              />
              <p className={styles.sellBackHint}>90%+ recommended</p>
            </div>
          </div>

          <div className={styles.panel} style={{marginTop:'0.75rem'}}>
            <div className={styles.panelTitle}>Add Items</div>
            <div className={styles.itemGrid}>
              <div><label>Name</label><input value={iName} onChange={e => setIName(e.target.value)} onKeyDown={e => e.key==='Enter'&&addBox()} /></div>
              <div><label>Value $</label><input type="number" value={iPrice} onChange={e => setIPrice(e.target.value)} min="0.01" /></div>
              <div><label>Ship $</label><input type="number" value={iShip} onChange={e => setIShip(e.target.value)} min="0" /></div>
              <div><label>Qty</label><input type="number" value={iQty} onChange={e => setIQty(e.target.value)} min="1" max="200" /></div>
            </div>
            <div className="field">
              <label>Item Image <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(optional)</span></label>
              <div className={styles.itemImgRow}>
                <div className={styles.itemImgUpload} onClick={() => itemImgInputRef.current?.click()}>
                  {iImgPreview ? (
                    <img src={iImgPreview} alt="Item preview" className={styles.itemImgPreview} />
                  ) : (
                    <div className={styles.itemImgPlaceholder}>
                      {iImgUploading ? <span className="spin" style={{width:16,height:16}} /> : <span style={{fontSize:'1.2rem'}}>📷</span>}
                    </div>
                  )}
                </div>
                {iImgPreview && <button className={styles.removeLogoBtn} onClick={() => { setIImg(''); setIImgPreview('') }}>Remove</button>}
              </div>
              <input ref={itemImgInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleItemImgUpload} />
            </div>
            <button className={styles.addBtn} onClick={addBox}>+ Add Item</button>
            <div className={styles.itemList}>
              {boxes.map(b => (
                <div key={b._id} className={styles.itemRow}>
                  {b.itemImageUrl && <img src={b.itemImageUrl} alt={b.itemName} style={{width:28,height:28,objectFit:'cover',borderRadius:4,flexShrink:0}} />}
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
                <div className={styles.previewRow}><span>Sell-back rate</span><span>{sellBackNum}%</span></div>
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

      {editingDrop && (
        <div className={styles.editOverlay} onClick={() => setEditingDrop(null)}>
          <div className={styles.editBox} onClick={e => e.stopPropagation()}>
            <h2 className={styles.editTitle}>Edit Drop</h2>
            {editError && <div className={styles.errBox}>{editError}</div>}
            <div className="field">
              <label>Drop Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="field">
              <label>Logo</label>
              <div className={styles.logoUploadArea} onClick={() => editLogoInputRef.current?.click()}>
                {editLogoPreview ? (
                  <img src={editLogoPreview} alt="Logo" className={styles.logoPreview} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    {editLogoUploading ? (
                      <><span className="spin" style={{width:20,height:20}} /><span>Uploading…</span></>
                    ) : (
                      <><span style={{fontSize:'1.5rem'}}>🖼️</span><span>Click to upload logo</span></>
                    )}
                  </div>
                )}
              </div>
              <input ref={editLogoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleEditLogoUpload} />
              {editLogoPreview && <button className={styles.removeLogoBtn} onClick={() => { setEditLogoUrl(''); setEditLogoPreview('') }}>Remove logo</button>}
            </div>
            <div style={{display:'flex',gap:'0.6rem',marginTop:'0.75rem'}}>
              <button className={styles.cancelEditBtn} onClick={() => setEditingDrop(null)}>Cancel</button>
              <button className={styles.saveEditBtn} onClick={saveEdit} disabled={editSaving}>
                {editSaving ? <span className="spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}