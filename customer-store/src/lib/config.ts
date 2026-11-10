/** Backend API base URL (NestJS). Set NEXT_PUBLIC_API_URL in .env.local */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '')

export const SITE_NAME = 'Marketplace'
