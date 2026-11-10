import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { SITE_NAME } from '@/lib/config'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — grocery, fashion & electronics delivered`, template: `%s · ${SITE_NAME}` },
  description: 'One account, many stores — shop grocery, fashion and electronics in one place.',
}

export const viewport: Viewport = { themeColor: '#1B7A4F' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={`${inter.variable} h-full`}>
      <body className='flex min-h-full flex-col font-sans'>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
