import Link from 'next/link'

export default function NotFound() {
  return (
    <div className='flex flex-1 flex-col items-center justify-center px-4 py-24 text-center'>
      <p className='text-sm font-bold text-brand-600'>404</p>
      <h1 className='mt-2 text-2xl font-bold'>We couldn’t find that page</h1>
      <p className='mt-2 text-sm text-n-600'>It may have moved, or the link is wrong.</p>
      <Link href='/' className='btn-primary mt-6'>Back to shopping</Link>
    </div>
  )
}
