import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { type Player, type PlayerPayload, type PlayerProfile } from '@/types'

export function usePlayers(sportId: number) {
  return useQuery({
    queryKey: ['sports', sportId, 'players'],
    queryFn: () => api.get(`/api/sports/${sportId}/players`).then((r) => r.data as Player[]),
    enabled: sportId > 0,
  })
}

export function useAllPlayers(enabled: boolean = true) {
  return useQuery({
    queryKey: ['players', 'all'],
    queryFn: () => api.get('/api/players').then((r) => r.data as Player[]),
    enabled,
  })
}

export function usePlayer(id: number) {
  return useQuery({
    queryKey: ['players', id],
    queryFn: () => api.get(`/api/players/${id}`).then((r) => r.data as Player),
    enabled: id > 0,
  })
}

/** GET /api/players/{id}/profile — unified profile (contact, department, sports, captaincy). */
export function usePlayerProfile(id: number) {
  return useQuery({
    queryKey: ['players', id, 'profile'],
    queryFn: () => api.get(`/api/players/${id}/profile`).then((r) => r.data as PlayerProfile),
    enabled: id > 0,
  })
}

export function useAddPlayer() {
  const qc = useQueryClient()
  return useMutation({
    // Posts to the global create endpoint so sportIds in the payload are the source of
    // truth (no unchecked-path-sport merge). sportId is retained only as a cache-invalidation
    // hint (the selected roster), so it may be null when registering outside a sport context.
    mutationFn: (vars: { sportId: number | null; data: PlayerPayload }) =>
      api.post(`/api/players`, vars.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['sports', variables.sportId, 'players'] })
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'players' })
    },
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PlayerPayload }) =>
      api.put(`/api/players/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('players') })
      qc.invalidateQueries({ queryKey: ['sports', variables.id, 'players'] })
    },
  })
}

export function useDeletePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/players/${id}`),
    onSuccess: () =>
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('players') }),
  })
}

export interface CaptainResult {
  captain: { id: number; username: string; fullName: string; email?: string }
  passwordNote?: string
}

export function usePromotePlayerToCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sportId,
      playerId,
      username,
      password,
    }: {
      sportId: number
      playerId: number
      /** Optional for players who already have a captain login (updates it); required for new ones. */
      username?: string
      /** Optional for players who already have a captain login (resets it); required for new ones. */
      password?: string
    }) =>
      api
        .post(`/api/sports/${sportId}/players/${playerId}/promote-captain`, { username, password })
        .then((r) => r.data as CaptainResult),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['sports', variables.sportId, 'players'] })
      qc.invalidateQueries({ queryKey: ['sports'] })
      qc.invalidateQueries({ queryKey: ['captains'] })
    },
  })
}

export function useDemoteCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sportId, playerId }: { sportId: number; playerId: number }) =>
      api.post(`/api/sports/${sportId}/players/${playerId}/demote`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['sports', variables.sportId, 'players'] })
      qc.invalidateQueries({ queryKey: ['sports'] })
    },
  })
}
