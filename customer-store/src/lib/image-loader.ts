'use client'

/**
 * next/image loader. Product, banner and logo images live on ImageKit, which resizes on its CDN
 * (`?tr=w-<width>,q-<quality>`), so they're never re-processed by the Next server.
 * Anything else is returned unchanged.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (!/^https:\/\/ik\.imagekit\.io\//.test(src)) return src
  const url = new URL(src)
  url.searchParams.set('tr', `w-${width},q-${quality ?? 80}`)
  return url.toString()
}
