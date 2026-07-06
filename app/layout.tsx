import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'GOC Club — Gods of Cricket',
    template: '%s | GOC Club',
  },
  description:
    'GOC Club — Gods of Cricket. Track monthly fees, manage player payments, view history and share memories from every match.',
  keywords: [
    'GOC', 'Gods of Cricket', 'GOC Club', 'cricket club',
    'cricket fee management', 'player payments', 'gali cricket',
  ],
  authors: [{ name: 'GOC Club' }],
  creator: 'GOC Club',
  metadataBase: new URL('https://gali-cricket-payment.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://gali-cricket-payment.vercel.app',
    siteName: 'GOC Club',
    title: 'GOC Club — Gods of Cricket',
    description:
      'Manage cricket club fees, track player payments and fines, and relive match memories — all in one place.',
    images: [
      {
        url: '/goc-logo.png',
        width: 1024,
        height: 1024,
        alt: 'GOC Club Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'GOC Club — Gods of Cricket',
    description: 'Manage cricket club fees, track player payments and share match memories.',
    images: ['/goc-logo.png'],
  },
  icons: {
    icon: [
      { url: '/goc-logo.png', type: 'image/png' },
    ],
    apple: '/goc-logo.png',
    shortcut: '/goc-logo.png',
  },
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GOC Club',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Favicon — GOC logo */}
        <link rel="icon" href="/goc-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/goc-logo.png" />
        <link rel="shortcut icon" href="/goc-logo.png" />
      </head>
      <body className="min-h-screen bg-[#0a0a0a] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
