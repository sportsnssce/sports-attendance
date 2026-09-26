package com.sportscamp.attendance.service;

import com.sportscamp.attendance.entity.Attendance;
import com.sportscamp.attendance.entity.Attendance.AttendanceStatus;
import com.sportscamp.attendance.dto.PlayerAttendanceDTO;
import com.sportscamp.attendance.dto.SessionAttendanceCountDTO;
import com.sportscamp.attendance.dto.SportAttendanceSummaryDTO;
import com.sportscamp.attendance.dto.DailyAttendanceExportDTO;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.TrainingSession;
import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.repository.AttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final PlayerService playerService;
    private final TrainingSessionService sessionService;

    public List<Attendance> findBySession(Long sessionId) {
        return attendanceRepository.findBySessionId(sessionId);
    }

    public List<Attendance> findByPlayer(Long playerId) {
        return attendanceRepository.findByPlayerId(playerId);
    }

    public List<PlayerAttendanceDTO> findPlayerAttendance(Long playerId) {
        return attendanceRepository.findByPlayerId(playerId).stream()
                .map(record -> new PlayerAttendanceDTO(
                        record.getId(),
                        record.getSession().getId(),
                        record.getSession().getTitle(),
                        record.getSession().getSessionDate(),
                        record.getSession().getSport().getId(),
                        record.getSession().getSport().getName(),
                        record.getStatus(),
                        record.getMarkedAt(),
                        record.getRemarks()))
                .toList();
    }

    public List<SessionAttendanceCountDTO> countPresentBySessions(Long sportId, List<Long> sessionIds) {
        if (sessionIds.isEmpty()) return List.of();
        return attendanceRepository.countPresentBySessionIds(
                sportId,
                sessionIds,
                List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
    }

    public List<DailyAttendanceExportDTO> exportBySportAndDate(Long sportId, java.time.LocalDate sessionDate) {
        return attendanceRepository.exportDailyAttendance(sportId, sessionDate);
    }

    public List<SportAttendanceSummaryDTO> summarizeBySport(Long sportId) {
        return attendanceRepository.summarizeBySport(sportId);
    }

    public List<Attendance> findBySportAndSession(Long sportId, Long sessionId) {
        return attendanceRepository.findBySportIdAndSessionId(sportId, sessionId);
    }

    /** A single attendance draft: the status plus an optional remark. */
    public record AttendanceDraft(AttendanceStatus status, String remarks) {}

    @Transactional
    public void saveAttendance(Long sessionId, Map<Long, AttendanceDraft> drafts, User markedBy) {
        if (drafts.isEmpty()) return;

        TrainingSession session = sessionService.findById(sessionId);
        if (session.getStatus() == TrainingSession.SessionStatus.HOLIDAY) {
            throw new IllegalStateException("This session is marked as a holiday; attendance cannot be recorded.");
        }
        List<Long> playerIds = List.copyOf(drafts.keySet());

        Map<Long, Player> playersById = new HashMap<>();
        for (Player player : playerService.findAllByIds(playerIds)) {
            playersById.put(player.getId(), player);
        }

        Map<Long, Attendance> attendanceByPlayerId = new HashMap<>();
        for (Attendance attendance : attendanceRepository.findBySessionIdAndPlayerIds(sessionId, playerIds)) {
            attendanceByPlayerId.put(attendance.getPlayer().getId(), attendance);
        }

        List<Attendance> toSave = new ArrayList<>(drafts.size());
        for (Map.Entry<Long, AttendanceDraft> entry : drafts.entrySet()) {
            Player player = playersById.get(entry.getKey());
            if (player == null) player = playerService.findById(entry.getKey());

            Attendance attendance = attendanceByPlayerId.get(player.getId());
            if (attendance == null) {
                attendance = Attendance.builder()
                        .player(player)
                        .session(session)
                        .build();
            }
            AttendanceDraft draft = entry.getValue();
            attendance.setStatus(draft.status());
            // remarks: non-null draft value (blank -> null) overwrites; absent (null) leaves untouched
            if (draft.remarks() != null) {
                attendance.setRemarks(draft.remarks().isBlank() ? null : draft.remarks().trim());
            }
            attendance.setMarkedBy(markedBy);
            attendance.setMarkedAt(LocalDateTime.now());
            toSave.add(attendance);
        }
        attendanceRepository.saveAll(toSave);
    }

    @Transactional
    public Attendance updateOne(Long attendanceId, AttendanceStatus status, String remarks, User markedBy) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance", attendanceId));
        attendance.setStatus(status);
        attendance.setRemarks(remarks);
        attendance.setMarkedBy(markedBy);
        attendance.setMarkedAt(LocalDateTime.now());
        return attendanceRepository.save(attendance);
    }

    public long countPresent(Long playerId) {
        return attendanceRepository.countByPlayerIdAndStatus(playerId, AttendanceStatus.PRESENT);
    }
}
