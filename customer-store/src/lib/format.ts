export const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

/** Only same-site paths or http(s) links — never javascript: etc. */
export const safeHref = (href: string | null | undefined) =>
  href && /^(\/(?!\/)\S*|https?:\/\/\S+)$/.test(href) ? href : null

export const productHref = (p: { slug: string; seller: { slug: string } }) => `/p/${p.seller.slug}/${p.slug}`
