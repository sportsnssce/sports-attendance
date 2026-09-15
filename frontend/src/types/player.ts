import type { SportLite } from './sport'

export interface Player {
  id: number
  fullName: string
  dateOfBirth?: string
  jerseyNumber?: number | string
  position?: string
  phone?: string
  email?: string
  department?: string
  notes?: string
  active?: boolean
  /** Multi-sport memberships returned by the backend in the new model. */
  sports?: SportLite[]
  /** @deprecated Backward-compatible hint: id of the first sport. Prefer `sports`. */
  sportId?: number
  /** @deprecated Backward-compatible single-sport object. Prefer `sports`. */
  sport?: {
    id: number
    name: string
  }
}

/**
 * Matches backend {@code PlayerProfileDTO}: a unified player view including
 * contact info, department, the sports they play, and their captaincy status.
 */
export interface PlayerProfile {
  id: number
  fullName: string
  email?: string | null
  phone?: string | null
  department?: string | null
  isCaptain: boolean
  /** Every sport this player captains (multi-sport captaincy is supported). */
  captainSports: SportLite[]
  sports: SportLite[]
  /** True when the player already has a ROLE_CAPTAIN login account. */
  hasCaptainLogin: boolean
  /** Existing login username (when hasCaptainLogin is true). */
  captainUsername?: string | null
}

/** Create/update payload accepted by POST /api/players and PUT /api/players/{id}. */
export type PlayerPayload = Partial<Player> & { sportIds?: number[] }