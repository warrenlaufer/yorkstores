import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const user = await getSession()
  if (user) redirect('/dashboard')

  const btn = {
    background: '#ffffff',
    color: '#000000',
    border: '2px solid #FF6B85',
    borderRadius: '8px',
    padding: '0.45rem 1.1rem',
    fontWeight: 700,
    fontSize: '0.8rem',
    textDecoration: 'none',
    display: 'inline-block',
  } as const

  const btnLg = {
    background: '#ffffff',
    color: '#000000',
    border: '2px solid #FF6B85',
    borderRadius: '12px',
    padding: '0.75rem 2rem',
    fontWeight: 800,
    fontSize: '0.95rem',
    textDecoration: 'none',
    display: 'inline-block',
  } as const

  return (
    <main style={{ minHeight:'100vh', background:'#08080B', color:'#EEEEF5', fontFamily:'var(--font)', display:'flex', flexDirection:'column' }}>

      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.25rem 2rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" fill="#FF6B85" width="28" height="28">
            <ellipse cx="20" cy="30" rx="13" ry="9"/>
            <ellipse cx="30" cy="16" rx="8" ry="7"/>
            <ellipse cx="37" cy="19" rx="4" ry="3"/>
            <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/>
            <ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/>
            <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/>
            <rect x="26" y="36" width="4" height="8" rx="2"/>
            <rect x="20" y="36" width="4" height="8" rx="2"/>
            <rect x="13" y="36" width="4" height="8" rx="2"/>
            <rect x="7" y="35" width="4" height="8" rx="2"/>
            <circle cx="35" cy="15" r="1.2" fill="#0F0F14"/>
            <ellipse cx="40" cy="20" rx="1.5" ry="1" fill="#0F0F14"/>
          </svg>
          <span style={{ fontWeight:900, fontSize:'1rem', letterSpacing:'-0.02em' }}>
            York<span style={{ color:'#FF6B85' }}>stores</span>
          </span>
          <span style={{ fontSize:'0.55rem', fontWeight:700, background:'rgba(255,107,133,0.15)', color:'#FF8FA3', border:'1px solid rgba(255,107,133,0.3)', borderRadius:4, padding:'2px 6px', letterSpacing:'0.08em', textTransform:'uppercase' }}>Beta</span>
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <Link href="/signin" style={btn}>Sign In</Link>
          <Link href="/signup" style={btn}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'5rem 1.5rem 4rem' }}>
        <h1 style={{ fontSize:'clamp(2.5rem,6vw,4.5rem)', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em', marginBottom:'1.25rem', maxWidth:700 }}>
          Shop. <span style={{ color:'#FF6B85' }}>Play.</span> Win.
        </h1>
        <p style={{ fontSize:'clamp(1rem,2vw,1.2rem)', color:'#9898B0', maxWidth:520, lineHeight:1.6, marginBottom:'2.5rem' }}>
          Open mystery boxes filled with real items. Keep what you love — or sell it back instantly for guaranteed value.
        </p>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', justifyContent:'center' }}>
          <Link href="/signup" style={btnLg}>Start Opening Boxes</Link>
          <Link href="/signin" style={{ ...btnLg, fontWeight:700 }}>Sign In</Link>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:'4rem 1.5rem', maxWidth:900, margin:'0 auto', width:'100%' }}>
        <h2 style={{ textAlign:'center', fontSize:'1.5rem', fontWeight:900, marginBottom:'0.5rem', letterSpacing:'-0.02em' }}>How it works</h2>
        <p style={{ textAlign:'center', color:'#9898B0', fontSize:'0.85rem', marginBottom:'3rem' }}>Three steps to your next great find.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1rem' }}>
          {[
            { icon:'💳', step:'01', title:'Top up your wallet', desc:'Add funds to your Yorkstores wallet and browse live drops from verified sellers.' },
            { icon:'🎁', step:'02', title:'Open a mystery box', desc:'Each box contains a real item — trading cards, coins, jewelry, watches, and more.' },
            { icon:'🔄', step:'03', title:'Keep it or sell back', desc:'Love what you got? Request delivery. Not feeling it? Sell back instantly for guaranteed value.' },
          ].map(item => (
            <div key={item.step} style={{ background:'#0F0F14', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'1.5rem' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>{item.icon}</div>
              <div style={{ fontSize:'0.6rem', fontWeight:700, color:'#FF6B85', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.4rem' }}>{item.step}</div>
              <div style={{ fontWeight:800, fontSize:'0.95rem', marginBottom:'0.5rem' }}>{item.title}</div>
              <div style={{ fontSize:'0.78rem', color:'#9898B0', lineHeight:1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding:'0 1.5rem 4rem', maxWidth:900, margin:'0 auto', width:'100%' }}>
        <h2 style={{ textAlign:'center', fontSize:'1.5rem', fontWeight:900, marginBottom:'0.5rem', letterSpacing:'-0.02em' }}>What's inside</h2>
        <p style={{ textAlign:'center', color:'#9898B0', fontSize:'0.85rem', marginBottom:'2rem' }}>Drops across a wide range of categories.</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', justifyContent:'center' }}>
          {['Trading Cards','Coins','Bullion','Watches','Jewelry','Luxury Brands','Sporting Goods','Other Collectibles'].map(cat => (
            <span key={cat} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'0.35rem 0.85rem', fontSize:'0.75rem', fontWeight:600, color:'#9898B0' }}>{cat}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'4rem 1.5rem', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <h2 style={{ fontSize:'clamp(1.5rem,4vw,2.5rem)', fontWeight:900, letterSpacing:'-0.02em', marginBottom:'1rem' }}>Ready to open your first box?</h2>
        <p style={{ color:'#9898B0', fontSize:'0.9rem', marginBottom:'2rem' }}>Join Yorkstores and start exploring drops today.</p>
        <Link href="/signup" style={{ ...btnLg, padding:'0.85rem 2.5rem', fontSize:'1rem' }}>Create Free Account</Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.07)', padding:'1.5rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'0.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" fill="#FF6B85" width="20" height="20">
            <ellipse cx="20" cy="30" rx="13" ry="9"/>
            <ellipse cx="30" cy="16" rx="8" ry="7"/>
            <ellipse cx="37" cy="19" rx="4" ry="3"/>
            <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/>
            <ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/>
            <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/>
            <rect x="26" y="36" width="4" height="8" rx="2"/>
            <rect x="20" y="36" width="4" height="8" rx="2"/>
            <rect x="13" y="36" width="4" height="8" rx="2"/>
            <rect x="7" y="35" width="4" height="8" rx="2"/>
            <circle cx="35" cy="15" r="1.2" fill="#0F0F14"/>
            <ellipse cx="40" cy="20" rx="1.5" ry="1" fill="#0F0F14"/>
          </svg>
          <span style={{ fontWeight:800, fontSize:'0.8rem' }}>York<span style={{ color:'#FF6B85' }}>stores</span></span>
        </div>
        <p style={{ fontSize:'0.7rem', color:'#9898B0' }}>© {new Date().getFullYear()} Yorkstores. All rights reserved.</p>
      </footer>

    </main>
  )
}