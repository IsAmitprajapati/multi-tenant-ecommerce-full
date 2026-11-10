'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, ApiError, setSessionExpiredHandler, tokens } from './client'
import type { CurrentUser } from '../types'

type Status = 'loading' | 'authenticated' | 'guest'

interface TokenResponse {
  accessToken?: string
  refreshToken?: string
  requiredsTwoFactor?: boolean
}

export interface RegisterInput { fullName: string; email: string; phone: string; password: string }

interface AuthContextValue {
  status: Status
  user: CurrentUser | null
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  reloadUser: () => Promise<void>
  setUser: (u: CurrentUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const reloadUser = useCallback(async () => {
    if (!tokens.access && !tokens.refresh) {
      setUser(null)
      setStatus('guest')
      return
    }
    try {
      const me = await api<CurrentUser>('/auth/me')
      if (me.userType !== 'CUSTOMER') throw new ApiError('Not a shopper account', 403)
      setUser(me)
      setStatus('authenticated')
    } catch (err) {
      // Only drop the session for auth failures, not when the API is briefly unreachable
      if (err instanceof ApiError && err.status !== 0) tokens.clear()
      setUser(null)
      setStatus('guest')
    }
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => { setUser(null); setStatus('guest') })
    // Read the saved session after mount (tokens live in localStorage, unavailable during SSR)
    queueMicrotask(reloadUser)
    // Signed in/out in another tab
    const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('mp.')) reloadUser() }
    window.addEventListener('storage', onStorage)
    return () => {
      setSessionExpiredHandler(null)
      window.removeEventListener('storage', onStorage)
    }
  }, [reloadUser])

  const acceptTokens = useCallback(async (res: TokenResponse) => {
    if (res.requiredsTwoFactor || !res.accessToken || !res.refreshToken) {
      throw new ApiError('Two-step verification isn’t supported on the store yet. Contact support.', 400)
    }
    tokens.set(res.accessToken, res.refreshToken)
    await reloadUser()
  }, [reloadUser])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<TokenResponse>('/auth/login', { method: 'POST', auth: false, json: { email: email.trim().toLowerCase(), password, panel: 'CUSTOMER' } })
    await acceptTokens(res)
  }, [acceptTokens])

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api<TokenResponse>('/auth/customer/register', { method: 'POST', auth: false, json: input })
    await acceptTokens(res)
  }, [acceptTokens])

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* sign out locally regardless */ }
    tokens.clear()
    setUser(null)
    setStatus('guest')
  }, [])

  const value = useMemo(
    () => ({ status, user, login, register, logout, reloadUser, setUser }),
    [status, user, login, register, logout, reloadUser],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
