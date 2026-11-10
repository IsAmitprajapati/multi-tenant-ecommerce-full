import Logo from '@/components/layout/Logo'

/** Split screen from the design: brand panel (desktop) + form */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className='flex min-h-dvh bg-white'>
      <aside className='relative hidden w-[min(560px,40vw)] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-900 to-brand-700 p-12 lg:flex'>
        <div className='absolute -top-24 -right-24 size-[280px] rounded-full bg-lime-500 opacity-10' />
        <div className='relative'><Logo tone='light' /></div>
        <div className='relative'>
          <p className='max-w-[400px] text-[30px] leading-snug font-bold text-white'>Grocery, fashion &amp; electronics, delivered to your door.</p>
          <p className='mt-3.5 text-sm text-[#C7DCCB]'>One account, every store — shop them all in one place.</p>
        </div>
        <p className='relative text-xs text-n-400'>Secure sign-in · your details stay private</p>
      </aside>
      <main className='flex flex-1 flex-col'>
        <div className='px-4 pt-5 lg:hidden'><Logo /></div>
        <div className='flex flex-1 items-center justify-center px-4 py-10'>
          <div className='w-full max-w-[380px]'>{children}</div>
        </div>
      </main>
    </div>
  )
}
