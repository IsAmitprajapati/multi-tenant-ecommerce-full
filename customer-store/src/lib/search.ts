/** Search tuning shared by the header box and the search page */
export const SEARCH_DEBOUNCE_MS = 300
export const MIN_SEARCH_LENGTH = 2
/** Results kept in memory per page visit (oldest dropped first) */
export const SEARCH_CACHE_SIZE = 50

/** Same key for "Mango", " mango " and "mango" */
export const searchKey = (q: string) => q.trim().replace(/\s+/g, ' ').toLowerCase()

export const searchHref = (q: string) => (q ? `/search?q=${encodeURIComponent(q)}` : '/search')
