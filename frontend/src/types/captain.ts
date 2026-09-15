export interface Captain {
  id: number
  username: string
  fullName: string
  email?: string
  phone?: string
  role: string
  enabled?: boolean
  active?: boolean
  /** Player record this login account is linked to (null for legacy accounts). */
  playerId?: number | null
  sportId?: number
  sportName?: string
}
