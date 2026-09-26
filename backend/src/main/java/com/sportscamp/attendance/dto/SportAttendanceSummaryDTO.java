package com.sportscamp.attendance.dto;

/** One per-player attendance total row for a single sport. */
public record SportAttendanceSummaryDTO(
        Long playerId,
        String playerName,
        Integer jerseyNumber,
        String year,
        String department,
        Long presentCount,
        Long absentCount,
        Long injuredCount,
        Long excusedCount,
        Long totalSessions
) {}
