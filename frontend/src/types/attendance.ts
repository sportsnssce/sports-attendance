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
  sessionTitle?: string
  sessionDate?: string
  sportId?: number
  sportName?: string
  playerFullName?: string
  status: AttendanceStatus
  remarks?: string
  markedAt?: string
}

export interface AttendanceExportRow {
  sportId: number
  sportName: string
  sessionId: number
  sessionTitle: string
  sessionDate: string
  startTime?: string
  playerId: number
  playerName: string
  jerseyNumber?: number
  year?: string
  department?: string
  email?: string
  phone?: string
  status: AttendanceStatus
  remarks?: string
  markedAt?: string
  markedBy?: string
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
