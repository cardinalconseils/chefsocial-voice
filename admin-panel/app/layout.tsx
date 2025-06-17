import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChefSocial Admin Panel',
  description: 'Admin dashboard for ChefSocial - Restaurant AI Marketing Platform',
  keywords: 'admin, dashboard, restaurant, AI, marketing, management',
  authors: [{ name: 'ChefSocial Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow', // Prevent search engines from indexing admin panel
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}