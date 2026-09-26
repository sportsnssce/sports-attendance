package com.sportscamp.attendance.repository;

import com.sportscamp.attendance.entity.Attendance;
import com.sportscamp.attendance.entity.Attendance.AttendanceStatus;
import com.sportscamp.attendance.dto.SessionAttendanceCountDTO;
import com.sportscamp.attendance.dto.SportAttendanceSummaryDTO;
import com.sportscamp.attendance.dto.DailyAttendanceExportDTO;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    @Query("SELECT a FROM Attendance a WHERE a.session.id = :sessionId")
    List<Attendance> findBySessionId(@Param("sessionId") Long sessionId);

    @Query("SELECT a FROM Attendance a WHERE a.session.id = :sessionId AND a.player.id IN :playerIds")
    List<Attendance> findBySessionIdAndPlayerIds(
            @Param("sessionId") Long sessionId,
            @Param("playerIds") List<Long> playerIds);

    @Query("""
            SELECT a FROM Attendance a JOIN FETCH a.session s JOIN FETCH s.sport
            WHERE a.player.id = :playerId AND s.status <> 'HOLIDAY'
            ORDER BY a.session.sessionDate DESC, a.session.startTime DESC
            """)
    List<Attendance> findByPlayerId(@Param("playerId") Long playerId);

    @Query("""
            SELECT new com.sportscamp.attendance.dto.SessionAttendanceCountDTO(a.session.id, COUNT(a))
            FROM Attendance a
            WHERE a.session.sport.id = :sportId
              AND a.session.id IN :sessionIds
              AND a.status IN :statuses
              AND a.session.status <> 'HOLIDAY'
            GROUP BY a.session.id
            """)
    List<SessionAttendanceCountDTO> countPresentBySessionIds(
            @Param("sportId") Long sportId,
            @Param("sessionIds") List<Long> sessionIds,
            @Param("statuses") List<AttendanceStatus> statuses);

        @Query("""
                        SELECT new com.sportscamp.attendance.dto.SportAttendanceSummaryDTO(
                                p.id, p.fullName, p.jerseyNumber, p.year, p.department,
                                COALESCE(SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END), 0),
                                COALESCE(SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END), 0),
                                COALESCE(SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END), 0),
                                COALESCE(SUM(CASE WHEN a.status = 'EXCUSED' THEN 1 ELSE 0 END), 0),
                                COUNT(a.id))
                        FROM Player p JOIN p.sports sp
                        LEFT JOIN Attendance a ON a.player.id = p.id
                                AND a.session.sport.id = :sportId
                                AND a.session.status <> 'HOLIDAY'
                        WHERE sp.id = :sportId
                        GROUP BY p.id, p.fullName, p.jerseyNumber, p.year, p.department
                        ORDER BY p.fullName
                        """)
        List<SportAttendanceSummaryDTO> summarizeBySport(@Param("sportId") Long sportId);

            @Query("""
                    SELECT new com.sportscamp.attendance.dto.DailyAttendanceExportDTO(
                        sp.id, sp.name, s.sessionDate, s.id, s.title, s.startTime,
                        p.id, p.fullName, p.jerseyNumber, p.year, p.department,
                        p.email, p.phone, a.status, a.remarks)
                    FROM TrainingSession s
                    JOIN s.sport sp
                    JOIN sp.players p
                    LEFT JOIN Attendance a ON a.session.id = s.id AND a.player.id = p.id
                    WHERE sp.id = :sportId
                      AND s.sessionDate = :sessionDate
                      AND s.status <> 'HOLIDAY'
                    ORDER BY s.startTime, p.fullName
                    """)
            List<DailyAttendanceExportDTO> exportDailyAttendance(
                    @Param("sportId") Long sportId,
                    @Param("sessionDate") LocalDate sessionDate);

    @Query("SELECT a FROM Attendance a WHERE a.player.id = :playerId AND a.session.id = :sessionId")
    Optional<Attendance> findByPlayerIdAndSessionId(@Param("playerId") Long playerId, @Param("sessionId") Long sessionId);

    @Query("""
            SELECT a FROM Attendance a
            JOIN a.player p JOIN p.sports sp
            WHERE sp.id = :sportId
              AND a.session.id = :sessionId
            """)
    List<Attendance> findBySportIdAndSessionId(
            @Param("sportId") Long sportId,
            @Param("sessionId") Long sessionId);

    @Query("""
            SELECT COUNT(a) FROM Attendance a
            WHERE a.player.id = :playerId
              AND a.status = :status
            """)
    long countByPlayerIdAndStatus(
            @Param("playerId") Long playerId,
            @Param("status") AttendanceStatus status);

    @Query("""
            SELECT COUNT(a) FROM Attendance a
            JOIN a.player p JOIN p.sports sp
            WHERE sp.id = :sportId
              AND a.status = 'PRESENT'
            """)
    long countPresentBySport(
            @Param("sportId") Long sportId);
}