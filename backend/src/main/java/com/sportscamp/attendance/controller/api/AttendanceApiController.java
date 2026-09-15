package com.sportscamp.attendance.controller.api;

import com.sportscamp.attendance.entity.Attendance;
import com.sportscamp.attendance.entity.Attendance.AttendanceStatus;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.TrainingSession;
import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.service.AttendanceService;
import com.sportscamp.attendance.service.PlayerService;
import com.sportscamp.attendance.service.TrainingSessionService;
import com.sportscamp.attendance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AttendanceApiController {

    private final AttendanceService attendanceService;
    private final UserService userService;
    private final TrainingSessionService sessionService;
    private final PlayerService playerService;

    private boolean isCaptainOfSession(User user, TrainingSession session) {
        return playerService.isCaptainOfSport(user, session.getSport());
    }

    private boolean isCaptainOfPlayer(User user, Player player) {
        return playerService.canManage(user, player);
    }

    /** GET /api/sessions/{sessionId}/attendance */
    @GetMapping("/sessions/{sessionId}/attendance")
    public ResponseEntity<List<Attendance>> getBySession(@PathVariable Long sessionId, Authentication auth) {
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            TrainingSession session = sessionService.findById(sessionId);
            if (!isCaptainOfSession(me, session)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(attendanceService.findBySession(sessionId));
    }

    /** GET /api/players/{playerId}/attendance */
    @GetMapping("/players/{playerId}/attendance")
    public ResponseEntity<List<Attendance>> getByPlayer(@PathVariable Long playerId, Authentication auth) {
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            Player player = playerService.findById(playerId);
            if (!isCaptainOfPlayer(me, player)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(attendanceService.findByPlayer(playerId));
    }

    /**
     * POST /api/sessions/{sessionId}/attendance
     * Bulk-submit attendance for a session.
     * Body: { "records": [ {"playerId":1,"status":"PRESENT"}, ... ] }
     */
    @PostMapping("/sessions/{sessionId}/attendance")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public ResponseEntity<Void> saveAttendance(
            @PathVariable Long sessionId,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        User me = userService.findByUsername(auth.getName());
        TrainingSession session = sessionService.findById(sessionId);
        if (!isCaptainOfSession(me, session)) {
            throw new AccessDeniedException("You are not authorized to record attendance for this sport.");
        }

        Map<Long, AttendanceService.AttendanceDraft> drafts = new HashMap<>();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> records = (List<Map<String, Object>>) body.get("records");
        if (records != null) {
            records.forEach(r -> {
                Long playerId = Long.valueOf(r.get("playerId").toString());
                AttendanceStatus status = AttendanceStatus.valueOf(r.get("status").toString());
                String remarks = r.containsKey("remarks") ? String.valueOf(r.get("remarks")) : null;
                drafts.put(playerId, new AttendanceService.AttendanceDraft(status, remarks));
            });
        }

        attendanceService.saveAttendance(sessionId, drafts, me);
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/attendance/{id}
     * Update a single attendance record.
     * Body: { "status":"LATE", "remarks":"Arrived 10 min late" }
     */
    @PatchMapping("/attendance/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public Attendance updateOne(@PathVariable Long id,
                                @RequestBody Map<String, String> body,
                                Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        AttendanceStatus status = AttendanceStatus.valueOf(body.get("status"));
        String remarks = body.getOrDefault("remarks", null);
        return attendanceService.updateOne(id, status, remarks, me);
    }

    /** GET /api/players/{playerId}/attendance/summary */
    @GetMapping("/players/{playerId}/attendance/summary")
    public Map<String, Long> summary(@PathVariable Long playerId) {
        return Map.of("presentCount", attendanceService.countPresent(playerId));
    }
}

