/**
 * Same frame for every My account page (symmetric layout): title + description on top,
 * then cards that fill the whole area to the right of the account menu.
 */
export const ACCOUNT_CONTENT_WIDTH = 'max-w-none'

export default function AccountPage({ title, description, actions, children }: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={`w-full ${ACCOUNT_CONTENT_WIDTH}`}>
      <div className='mb-4 flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h1 className='text-lg font-bold'>{title}</h1>
          {description && <p className='mt-0.5 text-[13px] text-n-600'>{description}</p>}
        </div>
        {actions}
      </div>
      <div className='flex flex-col gap-4'>{children}</div>
    </div>
  )
}
