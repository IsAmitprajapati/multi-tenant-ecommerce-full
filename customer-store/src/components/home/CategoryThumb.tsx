import CategoryIcon from './CategoryIcon'

/** Category icon uploaded in Platform admin, or a matching built-in icon, on a tinted square */
export default function CategoryThumb({ name, slug, iconUrl, size, rounded, tint, iconClass }: {
  name: string; slug: string; iconUrl: string | null
  /** Tailwind size class for the square, e.g. 'size-10' */
  size: string; rounded: string; tint: string
  /** Tailwind size class for the icon inside, e.g. 'size-5' */
  iconClass: string
}) {
  return (
    <span className={`flex shrink-0 items-center justify-center text-brand-700 ${size} ${rounded} ${tint}`}>
      {iconUrl
        // Plain <img>: icons are tiny and may be SVG
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={iconUrl} alt='' className={`${iconClass} object-contain`} loading='lazy' />
        : <CategoryIcon name={`${name} ${slug}`} className={iconClass} />}
    </span>
  )
}
