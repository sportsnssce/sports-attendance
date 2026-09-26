package com.sportscamp.attendance.dto;

import com.sportscamp.attendance.entity.Attendance;

import java.time.LocalDate;
import java.time.LocalTime;

/** One roster row per player and non-holiday session on the selected sport/date. */
public record DailyAttendanceExportDTO(
        Long sportId,
        String sportName,
        LocalDate sessionDate,
        Long sessionId,
        String sessionTitle,
        LocalTime startTime,
        Long playerId,
        String playerName,
        Integer jerseyNumber,
        String year,
        String department,
        String email,
        String phone,
        Attendance.AttendanceStatus status,
        String remarks
) {}
