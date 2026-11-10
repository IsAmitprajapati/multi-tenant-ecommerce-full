import Link from 'next/link'
import { safeHref } from '@/lib/format'
import type { PromoCard, PromoTheme } from '@/lib/types'

/** Colour themes from the design's collection tiles */
const THEMES: Record<PromoTheme, { bg: string; tag: string; fg: string }> = {
  DARK: { bg: 'bg-gradient-to-r from-brand-900 to-brand-700', tag: 'text-lime-500', fg: 'text-white' },
  SAND: { bg: 'bg-gradient-to-r from-[#F0E2C8] to-[#E3CD9E]', tag: 'text-[#155C3B]', fg: 'text-n-900' },
  MINT: { bg: 'bg-gradient-to-r from-brand-100 to-[#B9DDC3]', tag: 'text-[#155C3B]', fg: 'text-n-900' },
  LIME: { bg: 'bg-gradient-to-r from-lime-500 to-lime-600', tag: 'text-brand-800', fg: 'text-brand-900' },
  ROSE: { bg: 'bg-gradient-to-r from-[#E8C9D3] to-[#D8A8B8]', tag: 'text-[#7A2E4A]', fg: 'text-n-900' },
  SKY: { bg: 'bg-gradient-to-r from-[#C9D8E8] to-[#A8C0D8]', tag: 'text-[#1F4E7A]', fg: 'text-n-900' },
}

export default function PromoCards({ cards }: { cards: PromoCard[] }) {
  const cols = cards.length >= 3 ? 'sm:grid-cols-3' : cards.length === 2 ? 'sm:grid-cols-2' : ''
  return (
    <div className={`grid gap-4 ${cols}`}>
      {cards.map((c, i) => {
        const t = THEMES[c.theme] ?? THEMES.MINT
        const href = safeHref(c.linkUrl)
        const body = (
          <div className={`flex min-h-[140px] flex-col justify-end rounded-2xl p-6 ${t.bg} ${href ? 'transition-transform hover:-translate-y-0.5' : ''}`}>
            {c.tag && <div className={`text-xs font-bold tracking-[0.05em] uppercase ${t.tag}`}>{c.tag}</div>}
            <div className={`mt-1 text-lg font-bold ${t.fg}`}>{c.title}</div>
          </div>
        )
        if (!href) return <div key={i}>{body}</div>
        return href.startsWith('http')
          ? <a key={i} href={href} target='_blank' rel='noopener noreferrer'>{body}</a>
          : <Link key={i} href={href}>{body}</Link>
      })}
    </div>
  )
}
