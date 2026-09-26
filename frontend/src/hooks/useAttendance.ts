import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import {
  type AttendanceRecord,
  type AttendanceSummary,
  type BulkAttendancePayload,
} from '@/types/attendance'

export function useAttendance(sessionId: number) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'attendance'],
    queryFn: () =>
      api
        .get(`/api/sessions/${sessionId}/attendance`)
        .then((r) => r.data as AttendanceRecord[]),
    enabled: sessionId > 0,
  })
}

export function useSessionAttendanceCounts(sportId: number, sessionIds: number[]) {
  const ids = [...sessionIds].sort((a, b) => a - b)
  return useQuery({
    queryKey: ['sessions', 'attendance-counts', sportId, ids],
    queryFn: async () => {
      const params = new URLSearchParams()
      ids.forEach((id) => params.append('sessionIds', String(id)))
      const response = await api.get(
        `/api/sports/${sportId}/sessions/attendance-counts?${params.toString()}`
      )
      return new Map<number, number>(
        (response.data as { sessionId: number; presentCount: number }[])
          .map((item) => [item.sessionId, item.presentCount])
      )
    },
    enabled: sportId > 0 && ids.length > 0,
    staleTime: 30_000,
  })
}

export function useBulkSubmitAttendance(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkAttendancePayload) =>
      api.post(`/api/sessions/${sessionId}/attendance`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId, 'attendance'] })
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'sessions' })
    },
  })
}

export function useUpdateAttendanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Partial<AttendanceRecord>
    }) => api.patch(`/api/attendance/${id}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'sessions' }),
  })
}

export function usePlayerAttendance(playerId: number) {
  return useQuery({
    queryKey: ['players', playerId, 'attendance'],
    queryFn: () =>
      api
        .get(`/api/players/${playerId}/attendance`)
        .then((r) => r.data as AttendanceRecord[]),
    enabled: playerId > 0,
  })
}

export function usePlayerAttendanceSummary(playerId: number) {
  return useQuery({
    queryKey: ['players', playerId, 'attendance', 'summary'],
    queryFn: () =>
      api
        .get(`/api/players/${playerId}/attendance/summary`)
        .then((r) => r.data as AttendanceSummary),
    enabled: playerId > 0,
  })
}

export interface SportAttendanceSummaryRow {
  playerId: number
  playerName: string
  jerseyNumber?: number
  year?: string
  department?: string
  presentCount: number
  absentCount: number
  injuredCount: number
  excusedCount: number
  totalSessions: number
}

export interface DailyAttendanceExportRow {
  sportId: number
  sportName: string
  sessionDate: string
  sessionId: number
  sessionTitle: string
  startTime?: string
  playerId: number
  playerName: string
  jerseyNumber?: number
  year?: string
  department?: string
  email?: string
  phone?: string
  status?: AttendanceRecord['status'] | null
  remarks?: string | null
}

export function useExportSportAttendanceSummary() {
  return useMutation({
    mutationFn: (sportId: number) =>
      api.get(`/api/sports/${sportId}/attendance/summary`).then((r) => r.data as SportAttendanceSummaryRow[]),
  })
}

export function useExportSportAttendance() {
  return useMutation({
    mutationFn: ({ sportId, date }: { sportId: number; date: string }) =>
      api.get(`/api/sports/${sportId}/attendance/export`, { params: { date } })
        .then((r) => r.data as DailyAttendanceExportRow[]),
  })
}
