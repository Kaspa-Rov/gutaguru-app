import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GutaGuru — Zimbabwe Event Discovery',
  description: 'Discover the best nightlife, music, food & cultural events in Harare and Bulawayo.',
  keywords: ['Zimbabwe events', 'Harare nightlife', 'Bulawayo events', 'things to do Zimbabwe'],
  openGraph: {
    title: 'GutaGuru',
    description: "Your guide to Zimbabwe's best events",
    url: 'https://gutaguru.com',
    siteName: 'GutaGuru',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <div className="max-w-lg mx-auto min-h-screen relative">
          <Navbar />
          <main className="pb-20">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
