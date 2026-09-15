export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'

export interface AttendanceRecord {
  id: number
  sessionId?: number
  playerId?: number
  player?: {
    id: number
    fullName?: string
    jerseyNumber?: number
    position?: string
  }
  session?: {
    id: number
    title?: string
    sessionDate?: string
  }
  playerFullName?: string
  status: AttendanceStatus
  remarks?: string
  markedAt?: string
}

export interface AttendanceSummary {
  playerId: number
  playerFullName: string
  totalSessions: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  attendanceRate: number
}

export interface BulkAttendancePayload {
  records: {
    playerId: number
    status: AttendanceStatus
    remarks?: string
  }[]
}
