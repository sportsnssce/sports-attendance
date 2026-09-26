package com.sportscamp.attendance.dto;

import com.sportscamp.attendance.entity.Attendance;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PlayerAttendanceDTO(
        Long id,
        Long sessionId,
        String sessionTitle,
        LocalDate sessionDate,
        Long sportId,
        String sportName,
        Attendance.AttendanceStatus status,
        LocalDateTime markedAt,
        String remarks
) {}