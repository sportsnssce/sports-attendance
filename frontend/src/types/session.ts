export interface Session {
  id: number
  title: string
  sessionDate: string
  startTime?: string
  endTime?: string
  notes?: string
  sportId?: number
  sport?: {
    id: number
    name: string
  }
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'HOLIDAY'
}
