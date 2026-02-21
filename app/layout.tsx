import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TipTop.review',
  description: 'Build your professional reputation once, carry it everywhere',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
