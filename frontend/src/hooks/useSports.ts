import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { type Sport } from '@/types'

export function useSports(enabled: boolean = true) {
  return useQuery({
    queryKey: ['sports'],
    queryFn: () => api.get('/api/sports').then((r) => r.data as Sport[]),
    enabled,
  })
}

export function useActiveSports() {
  return useQuery({
    queryKey: ['sports', 'active'],
    queryFn: () => api.get('/api/sports/active').then((r) => r.data as Sport[]),
  })
}

export function useMySports(enabled: boolean = true) {
  return useQuery({
    queryKey: ['sports', 'my'],
    queryFn: () => api.get('/api/sports/my').then((r) => r.data as Sport[]),
    enabled,
  })
}

export interface SportOverview {
  id: number
  name: string
  description: string
  active: boolean
  totalPlayers: number
  captains: { id: number; fullName: string; email?: string }[]
}

/** GET /api/sports/overview — admin dashboard: active sports, roster counts, and captains. */
export function useSportsOverview() {
  return useQuery({
    queryKey: ['sports', 'overview'],
    queryFn: () => api.get('/api/sports/overview').then((r) => r.data as SportOverview[]),
  })
}

export function useCreateSport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Sport>) => api.post('/api/sports', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
    },
  })
}

export function useUpdateSport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Sport> }) =>
      api.patch(`/api/sports/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
    },
  })
}

export function useAssignCaptainToSport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sportId, captainId }: { sportId: number; captainId: number }) =>
      api.post(`/api/sports/${sportId}/captain`, { captainId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
      qc.invalidateQueries({ queryKey: ['captains'] })
    },
  })
}

export function useDeleteSport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/sports/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export function useRemoveCaptainFromSport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sportId, captainId }: { sportId: number; captainId: number }) =>
      api.delete(`/api/sports/${sportId}/captain/${captainId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports'] })
      qc.invalidateQueries({ queryKey: ['captains'] })
    },
  })
}
