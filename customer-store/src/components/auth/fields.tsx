'use client'

import { useId, useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: React.ReactNode; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className='field-label'>{label}</label>
      {children}
      {error
        ? <p id={`${id}-error`} className='mt-1.5 text-xs text-error'>{error}</p>
        : hint && <p className='mt-1.5 text-xs text-n-600'>{hint}</p>}
    </div>
  )
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & { label: string; error?: string; hint?: React.ReactNode }

export function TextField({ label, error, hint, ...props }: InputProps) {
  const id = useId()
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input id={id} className='field' aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
    </Field>
  )
}

export function PasswordField({ label, error, hint, ...props }: InputProps) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className='relative'>
        <input id={id} type={show ? 'text' : 'password'} className='field pr-10' aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined} {...props} />
        <button type='button' onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
          className='absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-n-600 hover:text-n-900'>
          {show ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
        </button>
      </div>
    </Field>
  )
}

export function FormAlert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: React.ReactNode }) {
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2
  return (
    <div role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium ${tone === 'error' ? 'bg-error/10 text-[#B23139]' : 'bg-brand-100 text-brand-700'}`}>
      <Icon className='mt-px size-4 shrink-0' /> <span>{children}</span>
    </div>
  )
}

export function Spinner() {
  return <span className='size-4 animate-spin rounded-full border-2 border-current border-r-transparent' aria-hidden />
}

/** Same rule as the API */
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/
export const PASSWORD_HINT = 'At least 8 characters with upper & lower case letters, a number and a symbol.'
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
