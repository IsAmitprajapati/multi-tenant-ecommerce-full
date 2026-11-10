'use client'

import { API_URL } from '../config'

/**
 * Browser-side API client for signed-in customers.
 * Tokens live in localStorage; an expired access token is refreshed once and the request retried.
 */
const ACCESS_KEY = 'mp.accessToken'
const REFRESH_KEY = 'mp.refreshToken'

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body?: unknown) {
    super(message)
  }
}

const read = (k: string) => {
  try { return localStorage.getItem(k) } catch { return null }
}

export const tokens = {
  get access() { return read(ACCESS_KEY) },
  get refresh() { return read(REFRESH_KEY) },
  set(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access)
      localStorage.setItem(REFRESH_KEY, refresh)
    } catch { /* storage blocked: session lasts for this page only */ }
  },
  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
    } catch { /* ignore */ }
  },
}

function messageFrom(body: unknown, fallback: string) {
  const m = (body as { message?: unknown } | null)?.message
  if (Array.isArray(m)) return String(m[0] ?? fallback)
  return typeof m === 'string' && m ? m : fallback
}

async function raw(path: string, init: RequestInit & { json?: unknown } = {}, auth = true) {
  const headers = new Headers(init.headers)
  if (init.json !== undefined) headers.set('content-type', 'application/json')
  const access = tokens.access
  if (auth && access) headers.set('authorization', `Bearer ${access}`)
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  })
}

let refreshing: Promise<boolean> | null = null

/** One refresh at a time, shared by every request that hit a 401 */
function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = tokens.refresh
    if (!refreshToken) return false
    try {
      const res = await raw('/auth/refresh', { method: 'POST', json: { refreshToken } }, false)
      if (!res.ok) return false
      const body = await res.json()
      tokens.set(body.accessToken, body.refreshToken)
      return true
    } catch {
      return false
    }
  })().finally(() => { refreshing = null })
  return refreshing
}

/** Called when the session can't be recovered (refresh failed) */
let onSessionExpired: (() => void) | null = null
export const setSessionExpiredHandler = (fn: (() => void) | null) => { onSessionExpired = fn }

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<T> {
  const auth = init.auth ?? true
  let res: Response
  try {
    res = await raw(path, init, auth)
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0)
  }
  if (res.status === 401 && auth && tokens.refresh) {
    if (await refreshTokens()) res = await raw(path, init, auth)
    else {
      tokens.clear()
      onSessionExpired?.()
    }
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(messageFrom(body, 'Something went wrong. Please try again.'), res.status, body)
  return body as T
}

export const errorMessage = (err: unknown, fallback = 'Something went wrong. Please try again.') =>
  err instanceof Error && err.message ? err.message : fallback
