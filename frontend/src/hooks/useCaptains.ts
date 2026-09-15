import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { type Captain } from '@/types'

export function useCaptains(enabled: boolean = true) {
  return useQuery({
    queryKey: ['captains'],
    queryFn: () => api.get('/api/users/captains').then((r) => r.data as Captain[]),
    enabled,
  })
}

export function useCreateCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Captain, 'id'>) => api.post('/api/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captains'] }),
  })
}

export function useResetPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      api.patch(`/api/users/${id}/password`, { newPassword }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captains'] }),
  })
}

export function useUpdateUsername() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, username }: { id: number; username: string }) =>
      api.patch(`/api/users/${id}/username`, { username }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captains'] }),
  })
}

export function useToggleCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.patch(`/api/users/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captains'] }),
  })
}

export function useDeleteCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captains'] })
      qc.invalidateQueries({ queryKey: ['sports'] })
    },
  })
}

export function useUpdateCaptain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { fullName: string; email?: string; phone?: string } }) =>
      api.patch(`/api/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['captains'] })
      qc.invalidateQueries({ queryKey: ['sports'] })
    },
  })
}
