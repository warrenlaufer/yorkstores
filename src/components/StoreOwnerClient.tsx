'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './StoreOwnerClient.module.css'

const CATEGORIES = ['Bullion','Certified Coins','Collectible Coins','Jewelry','Luxury Brands','Other Collectibles','Sporting Goods','Trading Cards','Watches']

type BoxDef = { itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl: string; qty: number; _id: string }
type Tx = { id: string; type: string; description: string; amount: number; createdAt: string }
type DropSummary = { id: string; name: string; logoUrl?: string; isActive: boolean; totalBoxes: number; soldBoxes: number; sellBackPct: number; pricingType: string; category: string }
type ExistingBox = { id: string; itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl: string | null; sold: boolean }
type ItemEdit = { oldName: string; oldPrice: number; oldShipping: number; newName: string; newPrice: string; newShipping: string; newImageUrl: string | null; addQty: number }

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
  const [pricingType, setPricingType] = useState<'fixed' | 'dynamic'>('fixed')
  const [category, setCategory] = useState('Other Collectibles')
  const [shippingMode, setShippingMode] = useState<'flat' | 'per_item'>('per_item')
  const [flatShipping, setFlatShipping] = useState('')
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

  const [psaCert, setPsaCert] = useState('')
  const [psaLoading, setPsaLoading] = useState(false)
  const [psaError, setPsaError] = useState('')
  const [psaResult, setPsaResult] = useState<any>(null)

  const [pcgsCert, setPcgsCert] = useState('')
  const [pcgsLoading, setPcgsLoading] = useState(false)
  const [pcgsError, setPcgsError] = useState('')
  const [pcgsResult, setPcgsResult] = useState<any>(null)

  const [editingDrop, setEditingDrop] = useState<DropSummary | null>(null)
  const [editName, setEditName] = useState('')
  const [editLogoUrl, setEditLogoUrl] = useState('')
  const [editLogoPreview, setEditLogoPreview] = useState('')
  const [editLogoUploading, setEditLogoUploading] = useState(false)
  const [editSellBackPct, setEditSellBackPct] = useState('90')
  const [editPricingType, setEditPricingType] = useState<'fixed' | 'dynamic'>('fixed')
  const [editCategory, setEditCategory] = useState('Other Collectibles')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [existingBoxes, setExistingBoxes] = useState<ExistingBox[]>([])
  const [editBoxesLoading, setEditBoxesLoading] = useState(false)
  const [removeBoxIds, setRemoveBoxIds] = useState<string[]>([])
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({})
  const [itemImgUploading, setItemImgUploading] = useState<Record<string, boolean>>({})
  const [eName, setEName] = useState('')
  const [ePrice, setEPrice] = useState('')
  const [eShip, setEShip] = useState('')
  const [eImg, setEImg] = useState('')
  const [eImgPreview, setEImgPreview] = useState('')
  const [eImgUploading, setEImgUploading] = useState(false)
  const [eQty, setEQty] = useState('1')
  const editLogoInputRef = useRef<HTMLInputElement>(null)
  const editItemImgInputRef = useRef<HTMLInputElement>(null)
  const itemImgRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const effectiveShip = shippingMode === 'flat' ? flatShipping : iShip

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/users/upload-url', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    return data.data.publicUrl
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setLogoUploading(true); setError('')
    try { const url = await uploadImage(file); setLogoUrl(url); setLogoPreview(url) }
    catch (e: any) { setError('Logo upload failed: ' + e.message) }
    finally { setLogoUploading(false) }
  }

  async function handleItemImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return }
    setIImgUploading(true); setError('')
    try { const url = await uploadImage(file); setIImg(url); setIImgPreview(url) }
    catch (e: any) { setError('Image upload failed: ' + e.message) }
    finally { setIImgUploading(false) }
  }

  async function handleEditLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setEditError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setEditError('Image must be under 5MB.'); return }
    setEditLogoUploading(true); setEditError('')
    try { const url = await uploadImage(file); setEditLogoUrl(url); setEditLogoPreview(url) }
    catch (e: any) { setEditError('Logo upload failed: ' + e.message) }
    finally { setEditLogoUploading(false) }
  }

  async function handleEditItemImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setEditError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setEditError('Image must be under 5MB.'); return }
    setEImgUploading(true); setEditError('')
    try { const url = await uploadImage(file); setEImg(url); setEImgPreview(url) }
    catch (e: any) { setEditError('Image upload failed: ' + e.message) }
    finally { setEImgUploading(false) }
  }

  async function handleExistingItemImgUpload(k: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setEditError('Please upload an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setEditError('Image must be under 5MB.'); return }
    setItemImgUploading(prev => ({ ...prev, [k]: true })); setEditError('')
    try {
      const url = await uploadImage(file)
      setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], newImageUrl: url } }))
    } catch (e: any) { setEditError('Image upload failed: ' + e.message) }
    finally { setItemImgUploading(prev => ({ ...prev, [k]: false })) }
  }

  async function lookupPSA() {
    if (!psaCert.trim()) return
    setPsaLoading(true); setPsaError(''); setPsaResult(null)
    try {
      const res = await fetch(`/api/psa?cert=${psaCert.trim()}`)
      const data = await res.json()
      if (!res.ok) { setPsaError(data.error || 'Cert not found'); return }
      setPsaResult(data.data)
      setIName(data.data.itemName)
      setIImg(data.data.imageUrl ?? '')
      setIImgPreview(data.data.imageUrl ?? '')
      setIPrice('')
    } catch { setPsaError('Failed to lookup cert') }
    finally { setPsaLoading(false) }
  }

  async function lookupPCGS() {
    if (!pcgsCert.trim()) return
    setPcgsLoading(true); setPcgsError(''); setPcgsResult(null)
    try {
      const res = await fetch(`/api/pcgs?cert=${pcgsCert.trim()}`)
      const data = await res.json()
      if (!res.ok) { setPcgsError(data.error || 'Cert not found'); return }
      setPcgsResult(data.data)
      setIName(data.data.itemName)
      setIImg(data.data.imageUrl ?? '')
      setIImgPreview(data.data.imageUrl ?? '')
      if (data.data.priceGuideValue) setIPrice(String(data.data.priceGuideValue))
    } catch { setPcgsError('Failed to lookup cert') }
    finally { setPcgsLoading(false) }
  }

  async function openEdit(drop: DropSummary) {
    setEditingDrop(drop)
    setEditName(drop.name)
    setEditLogoUrl(drop.logoUrl ?? '')
    setEditLogoPreview(drop.logoUrl ?? '')
    setEditSellBackPct(String(drop.sellBackPct))
    setEditPricingType(drop.pricingType === 'dynamic' ? 'dynamic' : 'fixed')
    setEditCategory(drop.category ?? 'Other Collectibles')
    setEditError('')
    setRemoveBoxIds([])
    setItemEdits({})
    setItemImgUploading({})
    setEName(''); setEPrice(''); setEShip(''); setEImg(''); setEImgPreview(''); setEQty('1')
    setEditBoxesLoading(true)
    try {
      const res = await fetch(`/api/drops/${drop.id}`)
      const data = await res.json()
      if (data.ok) {
        setExistingBoxes(data.data.boxes)
        const map: Record<string, ItemEdit> = {}
        data.data.boxes.forEach((b: ExistingBox) => {
          const k = `${b.itemName}|||${b.itemPrice}`
          if (!map[k]) map[k] = {
            oldName: b.itemName, oldPrice: b.itemPrice, oldShipping: b.itemShippingCost,
            newName: b.itemName, newPrice: String(b.itemPrice), newShipping: String(b.itemShippingCost),
            newImageUrl: b.itemImageUrl,
            addQty: 0,
          }
        })
        setItemEdits(map)
      }
    } catch {}
    finally { setEditBoxesLoading(false) }
  }

  function addEditBox() {
    const price = parseFloat(ePrice)
    if (!eName || isNaN(price) || price <= 0) { setEditError('Enter a valid item name and price.'); return }
    const existingKey = Object.keys(itemEdits).find(k => {
      const edit = itemEdits[k]
      return edit.newName === eName && parseFloat(edit.newPrice) === price
    })
    if (existingKey) {
      setItemEdits(prev => ({ ...prev, [existingKey]: { ...prev[existingKey], addQty: prev[existingKey].addQty + (parseInt(eQty) || 1) } }))
    } else {
      const k = `${eName}|||${price}_new_${Date.now()}`
      setItemEdits(prev => ({
        ...prev,
        [k]: {
          oldName: eName, oldPrice: price, oldShipping: parseFloat(eShip) || 0,
          newName: eName, newPrice: String(price), newShipping: String(parseFloat(eShip) || 0),
          newImageUrl: eImg || null,
          addQty: parseInt(eQty) || 1,
        }
      }))
      setExistingBoxes(prev => [...prev, {
        id: k, itemName: eName, itemPrice: price,
        itemShippingCost: parseFloat(eShip) || 0, itemImageUrl: eImg || null, sold: false,
      }])
    }
    setEName(''); setEPrice(''); setEShip(''); setEImg(''); setEImgPreview(''); setEQty('1')
    setEditError('')
  }

  async function saveEdit() {
    if (!editingDrop) return
    if (!editName.trim()) { setEditError('Drop name is required.'); return }
    setEditSaving(true); setEditError('')

    const updateItems = Object.values(itemEdits)
      .filter(it => !String(it.oldName).includes('_new_') && (
        it.newName !== it.oldName ||
        parseFloat(it.newPrice) !== it.oldPrice ||
        parseFloat(it.newShipping) !== it.oldShipping ||
        it.newImageUrl !== undefined
      ))
      .map(it => ({
        oldName: it.oldName, oldPrice: it.oldPrice,
        newName: it.newName, newPrice: parseFloat(it.newPrice) || it.oldPrice,
        newShipping: parseFloat(it.newShipping) || 0,
        newImageUrl: it.newImageUrl,
      }))

    const addBoxes = Object.values(itemEdits)
      .filter(it => it.addQty > 0)
      .map(it => ({
        itemName: it.newName,
        itemPrice: parseFloat(it.newPrice) || it.oldPrice,
        itemShippingCost: parseFloat(it.newShipping) || 0,
        itemImageUrl: it.newImageUrl || null,
        qty: it.addQty,
      }))

    try {
      const res = await fetch(`/api/drops/${editingDrop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          logoUrl: editLogoUrl || null,
          sellBackPct: Math.min(100, Math.max(1, parseInt(editSellBackPct) || 90)),
          pricingType: editPricingType,
          category: editCategory,
          addBoxes: addBoxes.length > 0 ? addBoxes : undefined,
          removeBoxIds: removeBoxIds.length > 0 ? removeBoxIds : undefined,
          updateItems: updateItems.length > 0 ? updateItems : undefined,
        }),
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
    const shipPrice = parseFloat(effectiveShip) || 0
    if (!iName || isNaN(price) || price <= 0) { setError('Enter a valid item name and price.'); return }
    setBoxes(prev => [...prev, {
      itemName: iName, itemPrice: price, itemShippingCost: shipPrice,
      itemImageUrl: iImg, qty: Math.max(1, parseInt(iQty) || 1), _id: Math.random().toString(36).slice(2),
    }])
    setIName(''); setIPrice(''); setIImg(''); setIImgPreview(''); setIQty('1')
    if (shippingMode === 'per_item') setIShip('')
    setPsaCert(''); setPsaResult(null); setPsaError('')
    setPcgsCert(''); setPcgsResult(null); setPcgsError('')
    setError('')
  }

  function removeBox(id: string) { setBoxes(prev => prev.filter(b => b._id !== id)) }

  const avgVal = boxes.length ? boxes.reduce((s, b) => s + b.itemPrice * b.qty, 0) / boxes.reduce((s, b) => s + b.qty, 0) : 0
  const boxPrice = Math.round(avgVal * 1.05)
  const totalBoxes = boxes.reduce((s, b) => s + b.qty, 0)
  const sellBackNum = Math.min(100, Math.max(1, parseInt(sellBackPct) || 90))

  async function publish() {
    if (!name) { setError('Give your drop a name.'); return }
    if (!boxes.length) { setError('Add at least one item.'); return }
    if (totalBoxes < 2) { setError('Add at least 2 boxes total.'); return }
    setPublishing(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl: logoUrl || null, emoji: '🎁', sellBackPct: sellBackNum, pricingType, category, boxes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Drop published!')
      setName(''); setLogoUrl(''); setLogoPreview(''); setSellBackPct('90'); setPricingType('fixed'); setCategory('Other Collectibles')
      setShippingMode('per_item'); setFlatShipping(''); setBoxes([])
      setTimeout(() => { setSuccess(''); router.refresh() }, 1500)
    } catch { setError('Something went wrong.') }
    finally { setPublishing(false) }
  }

  const existingItemMap: Record<string, { name: string; price: number; shipping: number; imageUrl: string | null; unsoldIds: string[]; soldCount: number }> = {}
  existingBoxes.forEach(b => {
    const k = `${b.itemName}|||${b.itemPrice}`
    if (!existingItemMap[k]) existingItemMap[k] = { name: b.itemName, price: b.itemPrice, shipping: b.itemShippingCost, imageUrl: b.itemImageUrl, unsoldIds: [], soldCount: 0 }
    if (b.sold) existingItemMap[k].soldCount++
    else existingItemMap[k].unsoldIds.push(b.id)
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Store Owner Dashboard</h1>
          <p className={styles.sub}>Box price = average item value +5%, rounded to nearest dollar.</p>
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <a href="/dashboard/store/theme" className={styles.historyBtn}>🎨 Theme</a>
          <a href="/dashboard/fulfilment" className={styles.fulfilmentBtn}>📦 Fulfilment</a>
        </div>
      </div>
      <div className={styles.panel} style={{marginBottom:'0.75rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.5rem'}}>
          <div className={styles.panelTitle} style={{margin:0}}>Store Wallet</div>
          <a href="/dashboard/store/history" className={styles.historyBtn}>View History</a>
        </div>
        <div className={styles.storeBalance}>${user.storeBalance.toFixed(2)}</div>
        <p className={styles.storeBalanceSub}>Funded from box sales. Covers buybacks.</p>
      </div>

      {drops.length > 0 && (
        <div className={styles.panel} style={{marginBottom:'0.75rem'}}>
          <div className={styles.panelTitle}>Your Drops</div>
          {drops.map(d => (
            <div key={d.id} className={styles.dropRow}>
              {d.logoUrl && <img src={d.logoUrl} alt={d.name} className={styles.dropRowLogo} />}
              <div className={styles.dropRowInfo}>
                <div className={styles.dropRowName}>{d.name}</div>
                <div className={styles.dropRowMeta}>
                  {d.soldBoxes} / {d.totalBoxes} sold · {d.isActive ? 'Active' : 'Inactive'} · {d.sellBackPct}% buyback · {d.pricingType} · {d.category}
                </div>
              </div>
              <div className={styles.dropRowActions}>
                <button className={styles.editBtn} onClick={() => openEdit(d)}>Edit</button>
                <a href={`/drop/${d.id}`} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>🔗 Share</a>
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
            <div className="field"><label>Drop Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field">
              <label>Drop Logo</label>
              <div className={styles.logoUploadArea} onClick={() => logoInputRef.current?.click()}>
                {logoPreview ? <img src={logoPreview} alt="Logo preview" className={styles.logoPreview} /> : (
                  <div className={styles.logoPlaceholder}>
                    {logoUploading ? <><span className="spin" style={{width:20,height:20}} /><span>Uploading…</span></> : <><span style={{fontSize:'1.5rem'}}>🖼️</span><span>Click to upload logo</span><span className={styles.logoHint}>PNG, JPG or WebP · Max 5MB</span></>}
                  </div>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoUpload} />
              {logoPreview && <button className={styles.removeLogoBtn} onClick={() => { setLogoUrl(''); setLogoPreview('') }}>Remove logo</button>}
            </div>
            <div className="field">
              <label>Buy Back Percentage</label>
              <input type="number" min="1" max="100" value={sellBackPct} onChange={e => setSellBackPct(e.target.value)} />
              <p className={styles.sellBackHint}>90%+ recommended</p>
            </div>
            <div className="field">
              <label>Pricing Type</label>
              <div className={styles.pricingToggle}>
                <button type="button" className={`${styles.pricingBtn} ${pricingType === 'fixed' ? styles.pricingBtnActive : ''}`} onClick={() => setPricingType('fixed')}>Fixed</button>
                <button type="button" className={`${styles.pricingBtn} ${pricingType === 'dynamic' ? styles.pricingBtnActive : ''}`} onClick={() => setPricingType('dynamic')}>Dynamic</button>
              </div>
              <p className={styles.sellBackHint}>{pricingType === 'fixed' ? 'Price stays the same as boxes are opened.' : 'Price updates based on remaining unsold boxes.'}</p>
            </div>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.panel} style={{marginTop:'0.75rem'}}>
            <div className={styles.panelTitle}>Add Items</div>

            <div className="field">
              <label>Shipping</label>
              <div className={styles.pricingToggle}>
                <button type="button" className={`${styles.pricingBtn} ${shippingMode === 'flat' ? styles.pricingBtnActive : ''}`} onClick={() => setShippingMode('flat')}>Flat Rate</button>
                <button type="button" className={`${styles.pricingBtn} ${shippingMode === 'per_item' ? styles.pricingBtnActive : ''}`} onClick={() => setShippingMode('per_item')}>Per Item</button>
              </div>
              {shippingMode === 'flat' && (
                <div style={{marginTop:'0.4rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                  <span style={{fontSize:'0.72rem',color:'var(--text2)',flexShrink:0}}>Flat rate $</span>
                  <input type="number" value={flatShipping} onChange={e => setFlatShipping(e.target.value)} min="0" placeholder="0.00" style={{width:90}} />
                </div>
              )}
              <p className={styles.sellBackHint}>{shippingMode === 'flat' ? 'Same shipping cost applied to all items.' : 'Enter shipping cost for each item individually.'}</p>
            </div>

            {category === 'Trading Cards' && (
              <div className={styles.psaSection}>
                <div className={styles.psaLabel}>PSA Cert Lookup <span style={{color:'var(--text3)',fontWeight:400,fontSize:'0.65rem'}}>(optional)</span></div>
                <div className={styles.psaRow}>
                  <input className={styles.psaInput} type="text" value={psaCert} onChange={e => { setPsaCert(e.target.value); setPsaResult(null); setPsaError('') }} onKeyDown={e => e.key === 'Enter' && lookupPSA()} placeholder="Enter PSA cert number…" />
                  <button className={styles.psaBtn} onClick={lookupPSA} disabled={psaLoading || !psaCert.trim()}>
                    {psaLoading ? <span className="spin" style={{width:14,height:14}} /> : 'Lookup'}
                  </button>
                </div>
                {psaError && <p className={styles.psaError}>{psaError}</p>}
                {psaResult && (
                  <div className={styles.psaResult}>
                    {psaResult.imageUrl && <img src={psaResult.imageUrl} alt={psaResult.itemName} className={styles.psaImage} />}
                    <div className={styles.psaResultInfo}>
                      <div className={styles.psaResultName}>{psaResult.itemName}</div>
                      <div className={styles.psaResultMeta}>{psaResult.grade && <span>PSA {psaResult.grade}</span>}{psaResult.category && <span> · {psaResult.category}</span>}</div>
                      <p className={styles.psaResultHint}>Name and image pre-filled below. Enter the value manually.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {category === 'Certified Coins' && (
              <div className={styles.psaSection}>
                <div className={styles.psaLabel} style={{color:'#F5C842'}}>PCGS Cert Lookup <span style={{color:'var(--text3)',fontWeight:400,fontSize:'0.65rem'}}>(optional)</span></div>
                <div className={styles.psaRow}>
                  <input className={styles.psaInput} type="text" value={pcgsCert} onChange={e => { setPcgsCert(e.target.value); setPcgsResult(null); setPcgsError('') }} onKeyDown={e => e.key === 'Enter' && lookupPCGS()} placeholder="Enter PCGS cert number…" />
                  <button className={styles.pcgsBtn} onClick={lookupPCGS} disabled={pcgsLoading || !pcgsCert.trim()}>
                    {pcgsLoading ? <span className="spin" style={{width:14,height:14}} /> : 'Lookup'}
                  </button>
                </div>
                {pcgsError && <p className={styles.psaError}>{pcgsError}</p>}
                {pcgsResult && (
                  <div className={styles.psaResult}>
                    {pcgsResult.imageUrl && <img src={pcgsResult.imageUrl} alt={pcgsResult.itemName} className={styles.psaImage} />}
                    <div className={styles.psaResultInfo}>
                      <div className={styles.psaResultName}>{pcgsResult.itemName}</div>
                      <div className={styles.psaResultMeta}>{pcgsResult.grade && <span>PCGS {pcgsResult.grade}</span>}{pcgsResult.denomination && <span> · {pcgsResult.denomination}</span>}</div>
                      {pcgsResult.priceGuideValue ? (
                        <p className={styles.psaResultHint} style={{color:'#F5C842'}}>Price guide: ${pcgsResult.priceGuideValue} — pre-filled below, adjust as needed.</p>
                      ) : (
                        <p className={styles.psaResultHint}>Name and image pre-filled below. Enter the value manually.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={shippingMode === 'flat' ? styles.itemGridNoShip : styles.itemGrid}>
              <div><label>Name</label><textarea value={iName} onChange={e => setIName(e.target.value)} rows={2} style={{resize:'vertical',minHeight:38}} /></div>
              <div><label>Value $</label><input type="number" value={iPrice} onChange={e => setIPrice(e.target.value)} min="0.01" /></div>
              {shippingMode === 'per_item' && <div><label>Ship $</label><input type="number" value={iShip} onChange={e => setIShip(e.target.value)} min="0" /></div>}
              <div><label>Qty</label><input type="number" value={iQty} onChange={e => setIQty(e.target.value)} min="1" max="200" /></div>
            </div>
            <div className="field">
              <label>Item Image <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>{category === 'Trading Cards' || category === 'Certified Coins' ? '(auto-filled from lookup)' : '(optional)'}</span></label>
              <div className={styles.itemImgRow}>
                <div className={styles.itemImgUpload} onClick={() => itemImgInputRef.current?.click()}>
                  {iImgPreview ? <img src={iImgPreview} alt="Item preview" className={styles.itemImgPreview} /> : (
                    <div className={styles.itemImgPlaceholder}>{iImgUploading ? <span className="spin" style={{width:16,height:16}} /> : <span style={{fontSize:'1.2rem'}}>📷</span>}</div>
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
                <div className={styles.previewRow}><span>Category</span><span>{category}</span></div>
                <div className={styles.previewRow}><span>Boxes</span><span>{totalBoxes}</span></div>
                <div className={styles.previewRow}><span>Avg value</span><span>${avgVal.toFixed(2)}</span></div>
                <div className={styles.previewRow}><span>Box price (avg +5%)</span><span style={{color:'#F5C842'}}>${boxPrice}</span></div>
                <div className={styles.previewRow}><span>Sell-back rate</span><span>{sellBackNum}%</span></div>
                <div className={styles.previewRow}><span>Pricing</span><span>{pricingType}</span></div>
                <div className={styles.previewRow}><span>Shipping</span><span>{shippingMode === 'flat' ? `$${parseFloat(flatShipping||'0').toFixed(2)} flat` : 'Per item'}</span></div>
                <div className={styles.previewRow}><span>Your revenue (95%)</span><span style={{color:'#3DD68C'}}>${(boxPrice * totalBoxes * 0.95).toFixed(2)}</span></div>
              </div>
            ) : <p className={styles.previewEmpty}>Add items to preview…</p>}
            {error && <div className={styles.errBox}>{error}</div>}
            {success && <div className={styles.successBox}>{success}</div>}
            <button className={styles.publishBtn} onClick={publish} disabled={publishing}>
              {publishing ? <span className="spin" /> : 'Publish Drop'}
            </button>
          </div>
        </div>
      </div>

      {editingDrop && (
        <div className={styles.editOverlay} onClick={() => setEditingDrop(null)}>
          <div className={styles.editBox} onClick={e => e.stopPropagation()}>
            <h2 className={styles.editTitle}>Edit Drop: {editingDrop.name}</h2>
            {editError && <div className={styles.errBox}>{editError}</div>}

            <div className={styles.editSection}>Basic Info</div>
            <div className="field"><label>Drop Name</label><input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div className="field">
              <label>Logo</label>
              <div className={styles.logoUploadArea} onClick={() => editLogoInputRef.current?.click()}>
                {editLogoPreview ? <img src={editLogoPreview} alt="Logo" className={styles.logoPreview} /> : (
                  <div className={styles.logoPlaceholder}>
                    {editLogoUploading ? <><span className="spin" style={{width:20,height:20}} /><span>Uploading…</span></> : <><span style={{fontSize:'1.5rem'}}>🖼️</span><span>Click to upload logo</span></>}
                  </div>
                )}
              </div>
              <input ref={editLogoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleEditLogoUpload} />
              {editLogoPreview && <button className={styles.removeLogoBtn} onClick={() => { setEditLogoUrl(''); setEditLogoPreview('') }}>Remove logo</button>}
            </div>
            <div className="field">
              <label>Buy Back Percentage</label>
              <input type="number" min="1" max="100" value={editSellBackPct} onChange={e => setEditSellBackPct(e.target.value)} />
              <p className={styles.sellBackHint}>90%+ recommended</p>
            </div>
            <div className="field">
              <label>Pricing Type</label>
              <div className={styles.pricingToggle}>
                <button type="button" className={`${styles.pricingBtn} ${editPricingType === 'fixed' ? styles.pricingBtnActive : ''}`} onClick={() => setEditPricingType('fixed')}>Fixed</button>
                <button type="button" className={`${styles.pricingBtn} ${editPricingType === 'dynamic' ? styles.pricingBtnActive : ''}`} onClick={() => setEditPricingType('dynamic')}>Dynamic</button>
              </div>
              <p className={styles.sellBackHint}>{editPricingType === 'fixed' ? 'Price stays the same as boxes are opened.' : 'Price updates based on remaining unsold boxes.'}</p>
            </div>
            <div className="field">
              <label>Category</label>
              <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.editSection}>Current Items</div>
            {editBoxesLoading ? <p style={{color:'var(--text2)',fontSize:'0.78rem'}}>Loading items…</p> : (
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',marginBottom:'0.75rem'}}>
                {Object.entries(existingItemMap).map(([k, it]) => {
                  const edit = itemEdits[k]
                  const markedCount = it.unsoldIds.filter(id => removeBoxIds.includes(id)).length
                  const availableAfter = it.unsoldIds.length - markedCount + (edit?.addQty ?? 0)
                  if (!edit) return null
                  const currentImg = edit.newImageUrl
                  const isDeleted = availableAfter === 0 && it.unsoldIds.length > 0
                  return (
                    <div key={k} className={`${styles.editItemBlock} ${isDeleted ? styles.itemRowRemove : ''}`}>
                      <div className={styles.editItemTop}>
                        <div className={styles.editItemImgWrap}>
                          <div className={styles.editItemImgBox} onClick={() => itemImgRefs.current[k]?.click()}>
                            {itemImgUploading[k] ? (
                              <span className="spin" style={{width:16,height:16}} />
                            ) : currentImg ? (
                              <img src={currentImg} alt={it.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:4}} />
                            ) : (
                              <span style={{fontSize:'1rem'}}>📷</span>
                            )}
                          </div>
                          {currentImg && (
                            <button className={styles.removeLogoBtn} onClick={() => setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], newImageUrl: null } }))} style={{fontSize:'0.6rem',marginTop:2}}>
                              Remove
                            </button>
                          )}
                          <input type="file" accept="image/*" style={{display:'none'}} ref={el => { itemImgRefs.current[k] = el }} onChange={e => handleExistingItemImgUpload(k, e)} />
                        </div>
                        <div className={styles.editItemFields}>
                          <textarea className={styles.editItemInput} value={edit.newName} onChange={e => setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], newName: e.target.value } }))} placeholder="Item name" rows={2} style={{resize:'vertical',minHeight:38}} />
                          <div style={{display:'flex',gap:4}}>
                            <div style={{display:'flex',flexDirection:'column',gap:2}}>
                              <span style={{fontSize:'0.55rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Value $</span>
                              <input className={styles.editItemInput} type="number" value={edit.newPrice} onChange={e => setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], newPrice: e.target.value } }))} style={{width:70}} />
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:2}}>
                              <span style={{fontSize:'0.55rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Ship $</span>
                              <input className={styles.editItemInput} type="number" value={edit.newShipping} onChange={e => setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], newShipping: e.target.value } }))} style={{width:60}} />
                            </div>
                          </div>
                        </div>
                        <div className={styles.qtyControls}>
                          <button className={styles.qtyBtn} disabled={availableAfter === 0} onClick={() => {
                            if ((edit.addQty ?? 0) > 0) {
                              setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], addQty: prev[k].addQty - 1 } }))
                            } else {
                              const last = it.unsoldIds.find(id => !removeBoxIds.includes(id))
                              if (last) setRemoveBoxIds(prev => [...prev, last])
                            }
                          }}>−</button>
                          <span className={styles.qtyVal}>{availableAfter}</span>
                          <button className={styles.qtyBtn} onClick={() => {
                            const lastMarked = [...it.unsoldIds].reverse().find(id => removeBoxIds.includes(id))
                            if (lastMarked) {
                              setRemoveBoxIds(prev => prev.filter(x => x !== lastMarked))
                            } else {
                              setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], addQty: (prev[k].addQty ?? 0) + 1 } }))
                            }
                          }}>+</button>
                          <button
                            className={styles.qtyBtn}
                            title="Delete all of this item type"
                            style={{background:'rgba(255,107,133,0.15)',borderColor:'rgba(255,107,133,0.4)',color:'#FF8FA3',marginLeft:4}}
                            onClick={() => {
                              setRemoveBoxIds(prev => [...prev, ...it.unsoldIds.filter(id => !prev.includes(id))])
                              setItemEdits(prev => ({ ...prev, [k]: { ...prev[k], addQty: 0 } }))
                            }}
                          >🗑</button>
                        </div>
                      </div>
                      <div className={styles.editItemMeta}>
                        {it.soldCount} sold · {it.unsoldIds.length - it.unsoldIds.filter(id => removeBoxIds.includes(id)).length} current
                        {(edit.addQty ?? 0) > 0 && <span style={{color:'#5FFFA8'}}> +{edit.addQty} adding</span>}
                        {isDeleted && <span style={{color:'#FF8FA3'}}> · will be removed</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className={styles.editSection}>Add New Item Type</div>
            <div className={styles.itemGrid}>
              <div><label>Name</label><textarea value={eName} onChange={e => setEName(e.target.value)} rows={2} style={{resize:'vertical',minHeight:38}} /></div>
              <div><label>Value $</label><input type="number" value={ePrice} onChange={e => setEPrice(e.target.value)} min="0.01" /></div>
              <div><label>Ship $</label><input type="number" value={eShip} onChange={e => setEShip(e.target.value)} min="0" /></div>
              <div><label>Qty</label><input type="number" value={eQty} onChange={e => setEQty(e.target.value)} min="1" max="200" /></div>
            </div>
            <div className="field">
              <label>Item Image <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>(optional)</span></label>
              <div className={styles.itemImgRow}>
                <div className={styles.itemImgUpload} onClick={() => editItemImgInputRef.current?.click()}>
                  {eImgPreview ? <img src={eImgPreview} alt="Item preview" className={styles.itemImgPreview} /> : (
                    <div className={styles.itemImgPlaceholder}>{eImgUploading ? <span className="spin" style={{width:16,height:16}} /> : <span style={{fontSize:'1.2rem'}}>📷</span>}</div>
                  )}
                </div>
                {eImgPreview && <button className={styles.removeLogoBtn} onClick={() => { setEImg(''); setEImgPreview('') }}>Remove</button>}
              </div>
              <input ref={editItemImgInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleEditItemImgUpload} />
            </div>
            <button className={styles.addBtn} onClick={addEditBox}>+ Add Item</button>

            <div style={{display:'flex',gap:'0.6rem',marginTop:'1rem'}}>
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