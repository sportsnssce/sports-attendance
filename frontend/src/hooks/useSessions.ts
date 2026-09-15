import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { type Session } from '@/types'

export function useAllSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get('/api/sessions').then((r) => r.data as Session[]),
  })
}

export interface SessionQuery {
  /** Single date (YYYY-MM-DD) — auto-creates default Morning/Evening if none exist. */
  date?: string
  /** Inclusive range start (YYYY-MM-DD) — no auto-generation. */
  from?: string
  /** Inclusive range end (YYYY-MM-DD) — no auto-generation. */
  to?: string
}

export function useSessions(sportId: number, params?: SessionQuery) {
  const qc = useQueryClient()
  const { date, from, to } = params ?? {}
  return useQuery({
    queryKey: ['sports', sportId, 'sessions', date ?? null, from ?? null, to ?? null],
    queryFn: async () => {
      const data = await api.get(`/api/sports/${sportId}/sessions`, { params }).then((r) => r.data as Session[])
      // Asking for a single date auto-creates the default Morning/Evening sessions
      // server-side. Refresh the sibling range (month-view) query so the calendar
      // picks up the new session dots. Range queries are excluded by the predicate,
      // so this cannot loop.
      if (date) {
        qc.invalidateQueries({
          queryKey: ['sports', sportId, 'sessions'],
          predicate: (q) => q.queryKey[4] != null && q.queryKey[5] != null,
        })
      }
      return data
    },
    enabled: sportId > 0,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sportId,
      data,
    }: {
      sportId: number
      data: Partial<Session>
    }) => api.post(`/api/sports/${sportId}/sessions`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['sports', variables.sportId, 'sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number
      status: Session['status']
    }) => api.patch(`/api/sessions/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('sessions') })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('sessions') })
    },
  })
}
