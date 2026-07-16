import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import PublicHeader from '@/components/PublicHeader'
import DashboardNav from '@/components/DashboardNav'

export const metadata: Metadata = {
  title: 'How it works · Yorkstores',
  description: 'How opening mystery boxes on Yorkstores works — the odds, keeping or selling back items, your wallet, and how we keep it fair.',
}

const heading: React.CSSProperties = { fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '2.4rem 0 0.7rem' }
const para: React.CSSProperties = { fontSize: '0.94rem', lineHeight: 1.75, margin: '0 0 0.9rem' }
const lead = { color: '#fff', fontWeight: 700 }

export default async function HowItWorksPage() {
  const user = await getSession()

  return (
    <div>
      {user ? (
        <DashboardNav
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company ?? undefined,
            walletBalance: Number(user.walletBalance),
            storeBalance: Number(user.storeBalance),
          }}
        />
      ) : (
        <PublicHeader />
      )}

      <main style={{ paddingTop: '4.5rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.6rem 1.25rem 5rem', color: 'var(--text2)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 1.2rem' }}>
            How Yorkstores works
          </h1>

          <p style={{ ...para, fontSize: '1.02rem' }}>
            <strong style={lead}>Yorkstores is a marketplace of mystery boxes.</strong> Independent stores list
            &ldquo;drops&rdquo; — collections of real items — and you open boxes to reveal what&rsquo;s inside. Every box
            comes from a real store&rsquo;s lineup, every possible prize is shown up front, and after you open a box you
            decide whether to keep it or sell it back. No mystery about the odds, just about which item you&rsquo;ll get.
          </p>

          <h2 style={heading}>The basics</h2>
          <p style={para}>
            A <strong style={lead}>drop</strong> is a themed set of boxes from one store — say, a trading-card drop or a
            gold-and-silver bullion drop. Each drop shows you:
          </p>
          <ul style={{ margin: '0 0 0.9rem', paddingLeft: '1.2rem' }}>
            <li style={{ ...para, margin: '0 0 0.4rem' }}><strong style={lead}>Every item you could win</strong></li>
            <li style={{ ...para, margin: '0 0 0.4rem' }}><strong style={lead}>Your odds</strong> of pulling each one</li>
            <li style={{ ...para, margin: 0 }}><strong style={lead}>The price to open a box</strong></li>
          </ul>
          <p style={para}>You pick a drop, open a box, and see what you got. Then you choose what happens next.</p>

          <h2 style={heading}>Opening a box, step by step</h2>
          <ol style={{ margin: '0 0 0.9rem', paddingLeft: '1.3rem' }}>
            <li style={{ ...para, margin: '0 0 0.5rem' }}><strong style={lead}>Choose a drop</strong> that interests you and review the prize pool and odds.</li>
            <li style={{ ...para, margin: '0 0 0.5rem' }}><strong style={lead}>Open a box</strong> — let the site pick one at random, or pick a specific box yourself. Either way the outcome is random and fair (more on that below).</li>
            <li style={{ ...para, margin: '0 0 0.5rem' }}><strong style={lead}>The reveal.</strong> Your box opens and shows the item you pulled.</li>
            <li style={{ ...para, margin: 0 }}><strong style={lead}>Keep it or sell it back.</strong> You now decide: have the item shipped to you, or sell it back instantly for credit.</li>
          </ol>

          <h2 style={heading}>What you&rsquo;re paying</h2>
          <p style={para}>
            The price to open a box is based on the estimated <strong style={lead}>value of the items in the drop</strong>,
            plus a small platform fee. You&rsquo;re not paying a random amount — the cost reflects what&rsquo;s genuinely in
            the pool. Some boxes you open will contain an item with an estimated value above what you paid; some below.
            That&rsquo;s the nature of a mystery box, and it&rsquo;s why the odds and estimated item values are always shown
            before you open.
          </p>

          <h2 style={heading}>After you open: keep it or sell it back</h2>
          <p style={para}>Once your box is revealed, you have two choices:</p>
          <p style={para}>
            <strong style={lead}>Keep it (get it shipped).</strong> The item is yours. You pay shipping, and sales tax
            where it applies, and the store sends it to you.
          </p>
          <p style={para}>
            <strong style={lead}>Sell it back.</strong> Not what you wanted, or you&rsquo;d rather have the credit? Sell the
            item back to the store instantly. You get back a set percentage of the item&rsquo;s estimated value — that
            percentage is shown on every drop before you open — added straight to your wallet as credit you can use on more
            boxes or cash out. Selling back is instant; you don&rsquo;t have to wait for anyone to approve it.
          </p>
          <p style={para}>
            You have a short window after the reveal to make this choice, so you&rsquo;re never stuck holding something you
            didn&rsquo;t want.
          </p>

          <h2 style={heading}>Your wallet</h2>
          <p style={para}>Everything runs through your Yorkstores wallet, which holds two kinds of balance:</p>
          <ul style={{ margin: '0 0 0.9rem', paddingLeft: '1.2rem' }}>
            <li style={{ ...para, margin: '0 0 0.5rem' }}><strong style={lead}>Cash balance</strong> — money you&rsquo;ve added or received from selling items back. This is yours; you can spend it on boxes or withdraw it to your bank.</li>
            <li style={{ ...para, margin: 0 }}><strong style={lead}>Promo credit</strong> — bonus credit from promotions. You can spend it on boxes, but it can&rsquo;t be cashed out.</li>
          </ul>
          <p style={para}>
            <strong style={lead}>Cashing out:</strong> you can withdraw your cash balance to your bank once you&rsquo;ve
            connected a payout account. There&rsquo;s a small minimum withdrawal, and withdrawals are reviewed before
            they&rsquo;re sent.
          </p>

          <h2 style={heading}>Delivery, shipping, and tax</h2>
          <p style={para}>
            If you keep an item, the store that listed the drop ships it to you. Shipping and any applicable sales tax are
            shown before you confirm delivery, so there are no surprises. Fulfillment is handled by the store, not by
            Yorkstores directly.
          </p>

          <h2 style={heading}>Live-priced items (bullion &amp; similar)</h2>
          <p style={para}>
            Some drops — like gold and silver bullion — contain items whose value changes with the live market. For these,
            the estimated item values you see are kept current with market prices, so the odds and payouts reflect an
            up-to-date estimate of what the item is worth, rather than a stale number from when the drop was created.
          </p>

          <h2 style={heading}>Is it fair?</h2>
          <p style={para}>Yes, and we don&rsquo;t ask you to take our word for it:</p>
          <div style={{ background: 'var(--surface-2, #1D1D26)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.1rem 1.3rem', margin: '0 0 0.9rem' }}>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li style={{ ...para, margin: '0 0 0.6rem' }}><strong style={lead}>Every prize and every probability is shown before you open.</strong> Nothing is hidden.</li>
              <li style={{ ...para, margin: '0 0 0.6rem' }}><strong style={lead}>Outcomes are random.</strong> Which item lands in your box isn&rsquo;t predetermined or steerable — not by you, not by the store.</li>
              <li style={{ ...para, margin: '0 0 0.6rem' }}><strong style={lead}>Stores can&rsquo;t see or rig which box holds which item.</strong> The pool is shuffled continuously as boxes are opened.</li>
              <li style={{ ...para, margin: 0 }}><strong style={lead}>Values are estimates.</strong> Item values reflect estimated market or retail value, and live-priced items track the market automatically.</li>
            </ul>
          </div>

          <h2 style={heading}>A few common questions</h2>
          <p style={para}><strong style={lead}>Do I always get something?</strong> Yes — every box contains an item from the pool. There are no empty boxes.</p>
          <p style={para}><strong style={lead}>What if I don&rsquo;t like what I got?</strong> Sell it back instantly for credit, or keep it. Your choice, every time.</p>
          <p style={para}><strong style={lead}>How do I get my item?</strong> Choose delivery after opening, pay shipping and any tax, and the store ships it to you.</p>
          <p style={para}><strong style={lead}>How do I get my money out?</strong> Connect a payout account, then request a withdrawal of your cash balance from your wallet.</p>

          <div style={{ marginTop: '2.6rem', paddingTop: '1.6rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
            <a href="/" className="btn btn-primary">Browse drops</a>
            {!user && <a href="/signup" className="btn btn-secondary">Create an account</a>}
          </div>
        </div>
      </main>
    </div>
  )
}
