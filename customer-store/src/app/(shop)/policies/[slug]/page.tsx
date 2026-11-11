import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { POLICIES } from '@/content/site'

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps<'/policies/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  return { title: POLICIES.find((p) => p.slug === slug)?.title ?? 'Policy' }
}

/** Public policy pages (linked from About & policies and the footer) */
export default async function PolicyPage({ params }: PageProps<'/policies/[slug]'>) {
  const { slug } = await params
  const policy = POLICIES.find((p) => p.slug === slug)
  if (!policy) notFound()
  return (
    <div className='mx-auto w-full max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <div>
        <Link href='/about' className='inline-flex items-center gap-1.5 text-[13px] font-semibold text-n-600 hover:text-brand-600'><ArrowLeft className='size-4' /> About & policies</Link>
        <h1 className='mt-3 text-2xl font-bold'>{policy.title}</h1>
        {policy.draft && <p className='mt-3 rounded-lg bg-warning/15 px-3.5 py-2.5 text-xs font-semibold text-[#8a5a00]'>Draft — this policy is being finalised and may change.</p>}
        <article className='card mt-5 flex flex-col gap-5'>
          {policy.sections.map((s) => (
            <section key={s.heading}>
              <h2 className='text-[15px] font-bold'>{s.heading}</h2>
              <p className='mt-1.5 text-[13px] leading-relaxed text-n-600'>{s.body}</p>
            </section>
          ))}
        </article>
        <nav className='mt-5 flex flex-wrap gap-2' aria-label='Other policies'>
          {POLICIES.filter((p) => p.slug !== slug).map((p) => (
            <Link key={p.slug} href={`/policies/${p.slug}`} className='rounded-full border border-n-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-brand-600'>{p.title}</Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
