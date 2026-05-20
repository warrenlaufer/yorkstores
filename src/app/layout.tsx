import type { Metadata } from 'next'
import { Outfit, Space_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Yorkstores — Mystery Box Platform',
  description: 'Open mystery boxes. Choose delivery or sell back within 5 minutes.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Yorkstores',
    description: 'Mystery box drops — buy, reveal, decide.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  )
}