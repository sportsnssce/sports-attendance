package com.sportscamp.attendance.service;

import com.sportscamp.attendance.entity.Attendance;
import com.sportscamp.attendance.entity.Attendance.AttendanceStatus;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.TrainingSession;
import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.repository.AttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    public List<Attendance> findBySportAndSession(Long sportId, Long sessionId) {
        return attendanceRepository.findBySportIdAndSessionId(sportId, sessionId);
    }

    /** A single attendance draft: the status plus an optional remark. */
    public record AttendanceDraft(AttendanceStatus status, String remarks) {}

    @Transactional
    public void saveAttendance(Long sessionId, Map<Long, AttendanceDraft> drafts, User markedBy) {
        TrainingSession session = sessionService.findById(sessionId);

        for (Map.Entry<Long, AttendanceDraft> entry : drafts.entrySet()) {
            Player player = playerService.findById(entry.getKey());
            Attendance attendance = attendanceRepository
                    .findByPlayerIdAndSessionId(player.getId(), session.getId())
                    .orElseGet(() -> Attendance.builder()
                            .player(player)
                            .session(session)
                            .build());
            AttendanceDraft draft = entry.getValue();
            attendance.setStatus(draft.status());
            // remarks: non-null draft value (blank -> null) overwrites; absent (null) leaves untouched
            if (draft.remarks() != null) {
                attendance.setRemarks(draft.remarks().isBlank() ? null : draft.remarks().trim());
            }
            attendance.setMarkedBy(markedBy);
            attendance.setMarkedAt(LocalDateTime.now());
            attendanceRepository.save(attendance);
        }
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
