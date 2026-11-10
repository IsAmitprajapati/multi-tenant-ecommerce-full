import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "https://marketplace.example.com/seller/x" → "marketplace.example.com/seller/x" */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '')
}
