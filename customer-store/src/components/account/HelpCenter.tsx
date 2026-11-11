import { ChevronDown, Mail, MessageCircle, Phone } from 'lucide-react'
import { HELP_TOPICS, SUPPORT } from '@/content/site'

/** Help & chat support (design): popular topics + ways to reach support */
export default function HelpCenter() {
  return (
    <>
      <section className='card py-2 sm:py-2' aria-labelledby='help-topics'>
        <h2 id='help-topics' className='pt-3 pb-1 text-[15px] font-bold'>Popular topics</h2>
        {HELP_TOPICS.map((t) => (
          <details key={t.q} className='group border-b border-n-200 last:border-0'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[13px] font-semibold [&::-webkit-details-marker]:hidden'>
              {t.q}<ChevronDown className='size-4 shrink-0 text-n-600 transition-transform group-open:rotate-180' />
            </summary>
            <p className='pb-4 text-[13px] leading-relaxed text-n-600'>{t.a}</p>
          </details>
        ))}
      </section>

      <section id='contact' className='card scroll-mt-24' aria-labelledby='help-contact'>
        <h2 id='help-contact' className='text-[15px] font-bold'>Still need help?</h2>
        <p className='mt-1 text-[13px] text-n-600'>Our support team is here for you.</p>
        <button type='button' disabled className='btn-primary mt-4 w-full py-3 text-[13px]'>
          <MessageCircle className='size-4' /> Chat with support
        </button>
        <p className='mt-1.5 text-center text-[11px] text-n-600'>Live chat is coming soon.</p>
        {(SUPPORT.phone || SUPPORT.email) && (
          <div className='mt-4 grid gap-2.5 sm:grid-cols-2'>
            {SUPPORT.phone && (
              <a href={`tel:${SUPPORT.phone.replace(/[^\d+]/g, '')}`} className='flex items-center gap-3 rounded-lg border border-n-200 px-3.5 py-3 hover:border-brand-600'>
                <Phone className='size-4 text-brand-600' />
                <span><span className='block text-[11px] text-n-600'>Call us</span><span className='block text-[13px] font-semibold'>{SUPPORT.phone}</span></span>
              </a>
            )}
            {SUPPORT.email && (
              <a href={`mailto:${SUPPORT.email}`} className='flex min-w-0 items-center gap-3 rounded-lg border border-n-200 px-3.5 py-3 hover:border-brand-600'>
                <Mail className='size-4 shrink-0 text-brand-600' />
                <span className='min-w-0'><span className='block text-[11px] text-n-600'>Email us</span><span className='block truncate text-[13px] font-semibold'>{SUPPORT.email}</span></span>
              </a>
            )}
          </div>
        )}
      </section>
    </>
  )
}
