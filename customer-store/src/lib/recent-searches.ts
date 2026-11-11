'use client'

import { useSyncExternalStore } from 'react'

/** Recent searches, kept per browser (newest first, max 8) */
const KEY = 'marketplace.recentSearches'
const EVENT = 'marketplace:recent-searches'
const MAX = 8

let cached: { raw: string | null; list: string[] } = { raw: null, list: [] }

function read(): string[] {
  let raw: string | null = null
  try { raw = localStorage.getItem(KEY) } catch { /* storage blocked */ }
  if (raw === cached.raw) return cached.list
  let list: string[] = []
  try {
    const v = JSON.parse(raw ?? '[]')
    if (Array.isArray(v)) list = v.filter((x): x is string => typeof x === 'string').slice(0, MAX)
  } catch { /* corrupt: start fresh */ }
  cached = { raw, list }
  return list
}

function write(list: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb() }
  window.addEventListener('storage', onStorage)
  window.addEventListener(EVENT, cb)
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, cb) }
}

const EMPTY: string[] = []
export const useRecentSearches = () => useSyncExternalStore(subscribe, read, () => EMPTY)

export function addRecentSearch(q: string) {
  const term = q.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (term.length < 2) return
  const list = read().filter((x) => x.toLowerCase() !== term.toLowerCase())
  write([term, ...list].slice(0, MAX))
}

export const removeRecentSearch = (q: string) => write(read().filter((x) => x !== q))
export const clearRecentSearches = () => write([])
