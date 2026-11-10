import { Link } from 'react-router'
import {
    ArrowRightIcon, BadgeCheckIcon, ClipboardListIcon, ClockIcon, PaletteIcon, RocketIcon, ShieldCheckIcon,
    StarIcon, StoreIcon, TruckIcon, WalletIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import SiteHeader, { SITE_CONTAINER } from '@/components/brand/SiteHeader'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/hooks/use-store'
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'

const STEPS = [
    { icon: ClipboardListIcon, title: 'Apply online', text: 'Tell us about your business and upload your KYC documents.' },
    { icon: BadgeCheckIcon, title: 'Get verified', text: 'Our team reviews your application, usually within 2 business days.' },
    { icon: PaletteIcon, title: 'Brand your page', text: 'Set your page URL, logo and brand color, then list your first products.' },
    { icon: RocketIcon, title: 'Go live and sell', text: 'Orders route through our delivery network. Payouts land on your cycle.' },
]

const FEATURES = [
    { icon: TruckIcon, title: 'Built-in delivery network', text: 'Verified delivery agents already cover your city — no fleet to manage yourself.' },
    { icon: WalletIcon, title: 'Transparent commission, fast payouts', text: 'See exactly what you earn per order, with payouts on a regular settlement cycle.' },
    { icon: StoreIcon, title: 'Your own branded seller page', text: 'Your logo and brand color on a fast, mobile-ready page — no design work needed.' },
]

const COMMISSION = [
    { label: 'Grocery & food', rate: 8 },
    { label: 'Fashion & apparel', rate: 12 },
    { label: 'Electronics', rate: 6 },
]

const TESTIMONIALS = [
    { quote: 'We went from a single physical shop to 40 orders a day within two months — the delivery network meant we didn’t have to hire riders.', name: 'Meera Pillai', business: 'Green Grocer, Bengaluru' },
    { quote: 'Payouts land on time every cycle, and the commission is clear upfront — no surprise deductions we’ve had to chase down.', name: 'Arjun Das', business: 'Urban Threads, Pune' },
    { quote: 'Setup took a single afternoon — upload KYC, list products, done. We were live before the review window even ended.', name: 'Kabir Joshi', business: 'CircuitHub, Hyderabad' },
]

const FAQ = [
    { q: 'Do I need my own delivery staff?', a: 'No — orders route through the platform’s delivery network by default. You can switch to your own fleet anytime from Delivery settings.' },
    { q: 'How and when do I get paid?', a: 'Payouts settle to your bank account on a regular cycle, after commission is deducted — the full breakdown is visible in your dashboard.' },
    { q: 'What documents do I need for KYC?', a: 'Aadhaar, PAN, your business registration certificate, and an FSSAI license if you sell grocery or food.' },
    { q: 'Can I sell alongside my own website?', a: 'Yes — most sellers use the marketplace as an additional sales channel, not a replacement for their existing shop.' },
]

export default function LandingPage() {
    const signedIn = Boolean(useAppSelector(s => s.auth.accessToken))
    const primaryCta = signedIn ? { to: '/dashboard', label: 'Go to dashboard' } : { to: '/apply', label: 'Start selling — it’s free' }

    return (
        <div className='min-h-svh bg-background text-foreground'>
            {/* Nav */}
            <SiteHeader>
                <nav className='hidden items-center gap-7 text-[13.5px] font-semibold text-muted-foreground lg:flex'>
                    <a href='#how' className='hover:text-foreground'>How it works</a>
                    <a href='#commission' className='hover:text-foreground'>Commission</a>
                    <a href='#stories' className='hover:text-foreground'>Success stories</a>
                    <a href='#faq' className='hover:text-foreground'>FAQ</a>
                </nav>
                <span className='hidden h-5 w-px bg-border lg:block' aria-hidden />
                {!signedIn && <Link to='/auth/login' className='text-[13.5px] font-semibold text-muted-foreground hover:text-foreground'>Sign in</Link>}
                <Button asChild className='h-10 px-5 font-semibold'><Link to={primaryCta.to}>{signedIn ? 'Dashboard' : 'Start selling'}</Link></Button>
            </SiteHeader>

            {/* Hero */}
            <section className='bg-gradient-to-br from-[#06251A] to-[#10543A] text-white'>
                <div className={cn(SITE_CONTAINER, 'grid items-center gap-12 py-20 lg:grid-cols-2')}>
                    <div>
                        <span className='inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#9fe870]'>
                            <span className='size-1.5 rounded-full bg-[#9fe870]' /> Now onboarding grocery, fashion &amp; electronics sellers
                        </span>
                        <h1 className='mt-5 text-4xl leading-tight font-bold sm:text-5xl'>Open your online business in minutes. We bring the customers.</h1>
                        <p className='mt-5 max-w-xl text-base leading-relaxed text-[#c7dccb]'>
                            Get your own branded seller page, a built-in delivery network and regular payouts — no code, no setup fees.
                        </p>
                        <div className='mt-8 flex flex-wrap items-center gap-4'>
                            <Button asChild className='h-12 bg-[#9fe870] px-6 text-base font-semibold text-[#06251A] hover:bg-[#9fe870]/90'>
                                <Link to={primaryCta.to}>{primaryCta.label} <ArrowRightIcon /></Link>
                            </Button>
                            <span className='flex items-center gap-1.5 text-sm text-[#c7dccb]'><ClockIcon className='size-4' /> Takes about 10 minutes</span>
                        </div>
                    </div>
                    {/* Preview card */}
                    <div className='rounded-2xl bg-white p-6 text-foreground shadow-2xl'>
                        <div className='text-xs font-semibold text-muted-foreground'>Today’s overview · Green Grocer</div>
                        <div className='mt-4 grid grid-cols-2 gap-4'>
                            <div className='rounded-xl bg-muted/50 p-4'><div className='text-xs text-muted-foreground'>Orders today</div><div className='mt-1 text-2xl font-bold'>42</div></div>
                            <div className='rounded-xl bg-muted/50 p-4'><div className='text-xs text-muted-foreground'>Revenue</div><div className='mt-1 text-2xl font-bold'>₹18.4K</div></div>
                        </div>
                        <div className='mt-4 flex h-24 items-end gap-2'>
                            {[45, 60, 52, 70, 65, 85, 78, 100].map((h, i) => <div key={i} className='flex-1 rounded-t-md bg-primary/80' style={{ height: `${h}%` }} />)}
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id='how' className={cn(SITE_CONTAINER, 'scroll-mt-20 py-20')}>
                <h2 className='text-center text-3xl font-bold'>From application to your first order in 4 steps</h2>
                <div className='mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                    {STEPS.map((s, i) => (
                        <div key={s.title} className='rounded-2xl border bg-card p-6'>
                            <div className='flex items-center gap-3'>
                                <span className='flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'><s.icon className='size-5' /></span>
                                <span className='text-sm font-bold text-muted-foreground'>Step {i + 1}</span>
                            </div>
                            <h3 className='mt-4 font-bold'>{s.title}</h3>
                            <p className='mt-1.5 text-sm text-muted-foreground'>{s.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className='bg-muted/40 py-20'>
                <div className={cn(SITE_CONTAINER, 'grid gap-6 md:grid-cols-3')}>
                    {FEATURES.map(f => (
                        <div key={f.title} className='rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/5'>
                            <span className='flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground'><f.icon className='size-5' /></span>
                            <h3 className='mt-4 font-bold'>{f.title}</h3>
                            <p className='mt-1.5 text-sm text-muted-foreground'>{f.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Commission */}
            <section id='commission' className={cn(SITE_CONTAINER, 'scroll-mt-20 py-20')}>
                <h2 className='text-center text-3xl font-bold'>No monthly fees — you only pay when you sell</h2>
                <p className='mx-auto mt-3 max-w-2xl text-center text-muted-foreground'>
                    Commission is a flat percentage of each order, deducted at payout. No listing fees, no setup cost, no subscription.
                </p>
                <div className='mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3'>
                    {COMMISSION.map(c => (
                        <div key={c.label} className='rounded-2xl border bg-card p-6 text-center'>
                            <div className='text-sm font-semibold text-muted-foreground'>{c.label}</div>
                            <div className='mt-2 text-4xl font-bold text-primary'>{c.rate}%</div>
                            <div className='mt-1 text-xs text-muted-foreground'>Default rate for this category, set on approval</div>
                        </div>
                    ))}
                </div>
                <p className='mt-6 text-center text-xs text-muted-foreground'>
                    Your exact rate is confirmed during review and always visible in your dashboard.
                </p>
            </section>

            {/* Testimonials */}
            <section id='stories' className='scroll-mt-20 bg-muted/40 py-20'>
                <div className={SITE_CONTAINER}>
                    <h2 className='text-center text-3xl font-bold'>Sellers already growing here</h2>
                    <div className='mt-10 grid gap-6 md:grid-cols-3'>
                        {TESTIMONIALS.map(t => (
                            <figure key={t.name} className='rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/5'>
                                <div className='flex gap-0.5 text-amber-500'>{Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} className='size-4 fill-current' />)}</div>
                                <blockquote className='mt-4 text-sm leading-relaxed'>“{t.quote}”</blockquote>
                                <figcaption className='mt-4 text-sm'><span className='font-semibold'>{t.name}</span> <span className='text-muted-foreground'>· {t.business}</span></figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id='faq' className='mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-20 sm:px-8'>
                <h2 className='text-center text-3xl font-bold'>Common questions</h2>
                <Accordion type='single' collapsible className='mt-8'>
                    {FAQ.map((f, i) => (
                        <AccordionItem key={f.q} value={`q${i}`}>
                            <AccordionTrigger className='text-left text-base font-semibold'>{f.q}</AccordionTrigger>
                            <AccordionContent className='text-muted-foreground'>{f.a}</AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>

            {/* Final CTA */}
            <section className='bg-gradient-to-br from-[#06251A] to-[#10543A] py-16 text-center text-white'>
                <h2 className='text-3xl font-bold'>Ready to start selling?</h2>
                <p className='mt-2 text-[#c7dccb]'>Applications are usually reviewed within 2 business days.</p>
                <Button asChild className='mt-6 h-12 bg-[#9fe870] px-6 text-base font-semibold text-[#06251A] hover:bg-[#9fe870]/90'>
                    <Link to={primaryCta.to}>{primaryCta.label} <ArrowRightIcon /></Link>
                </Button>
                <div className='mt-4 flex items-center justify-center gap-1.5 text-xs text-[#8fb093]'>
                    <ShieldCheckIcon className='size-3.5' /> Your documents are stored privately and reviewed only by the platform team
                </div>
            </section>

            <footer className='border-t py-6 text-center text-xs text-muted-foreground'>&copy; 2026 Dynamic Coding with Amit</footer>
        </div>
    )
}
