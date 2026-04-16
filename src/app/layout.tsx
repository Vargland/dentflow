import './globals.css'

import type { Metadata } from 'next'
import { Geist } from 'next/font/google'

import { getLang } from '@/lib/i18n/get-lang'
import { Toaster } from '@/components/ui/sonner'
import { I18nProvider } from '@/components/i18n-provider'
import { SessionProvider } from '@/components/session-provider'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DentFlow',
  description: 'Dental practice management system',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await getLang()

  return (
    <html lang={lang} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <SessionProvider>
          <I18nProvider lang={lang}>{children}</I18nProvider>
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
