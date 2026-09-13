/**
 * Base URL of the backend. Override per-environment via VITE_API_BASE_URL
 * (set it on Vercel / your hosting build), defaulting to the local dev server.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080'

export const ROLES = {
  ADMIN: 'ROLE_ADMIN',
  CAPTAIN: 'ROLE_CAPTAIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
