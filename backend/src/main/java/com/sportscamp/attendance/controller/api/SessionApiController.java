package com.sportscamp.attendance.controller.api;

import com.sportscamp.attendance.entity.Sport;
import com.sportscamp.attendance.entity.TrainingSession;
import com.sportscamp.attendance.entity.User;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SessionApiController {

    private final TrainingSessionService sessionService;
    private final UserService userService;
    private final PlayerService playerService;

    private boolean isCaptainOfSport(User user, Long sportId) {
        return playerService.isCaptain(user, sportId);
    }

    private boolean isCaptainOfSession(User user, TrainingSession session) {
        return playerService.isCaptainOfSport(user, session.getSport());
    }

    /** GET /api/sessions — all sessions (scoped to captain's assigned sports if captain) */
    @GetMapping("/sessions")
    public List<TrainingSession> listAll(Authentication auth) {
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            if (me.getRole() == User.Role.ROLE_CAPTAIN) {
                List<Sport> mySports = playerService.findCaptainSports(me);
                List<TrainingSession> result = new ArrayList<>();
                for (Sport sport : mySports) {
                    result.addAll(sessionService.findBySport(sport.getId()));
                }
                return result;
            }
        }
        return sessionService.findAll();
    }

    /**
     * GET /api/sports/{sportId}/sessions
     * Optional params:
     *   ?date=YYYY-MM-DD  -> sessions for that date (auto-creates default Morning/Evening if none exist)
     *   ?from=&to=        -> sessions in a date range (no auto-generation)
     */
    @GetMapping("/sports/{sportId}/sessions")
    public ResponseEntity<List<TrainingSession>> listBySport(@PathVariable Long sportId,
                                                             @RequestParam(required = false) java.time.LocalDate date,
                                                             @RequestParam(required = false) java.time.LocalDate from,
                                                             @RequestParam(required = false) java.time.LocalDate to,
                                                             Authentication auth) {
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            if (!isCaptainOfSport(me, sportId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        if (date != null) {
            return ResponseEntity.ok(sessionService.findBySportAndDate(sportId, date));
        }
        if (from != null && to != null) {
            return ResponseEntity.ok(sessionService.findBySportBetween(sportId, from, to));
        }
        return ResponseEntity.ok(sessionService.findBySport(sportId));
    }

    /** GET /api/sessions/{id} */
    @GetMapping("/sessions/{id}")
    public ResponseEntity<TrainingSession> getById(@PathVariable Long id, Authentication auth) {
        TrainingSession session = sessionService.findById(id);
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            if (!isCaptainOfSession(me, session)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(session);
    }

    /**
     * POST /api/sports/{sportId}/sessions
     * body: { "title":"Morning Practice", "sessionDate":"2025-06-05",
     *         "startTime":"07:00", "endTime":"09:00", "notes":"Drills" }
     */
    @PostMapping("/sports/{sportId}/sessions")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_CAPTAIN')")
    public ResponseEntity<TrainingSession> create(@PathVariable Long sportId,
                                                  @RequestBody Map<String, Object> body,
                                                  Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        if (!isCaptainOfSport(me, sportId)) {
            throw new AccessDeniedException("You are not authorized to create sessions for this sport.");
        }
        TrainingSession session = buildSession(body);
        TrainingSession saved = sessionService.createForSport(session, sportId);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** PUT /api/sessions/{id} */
    @PutMapping("/sessions/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_CAPTAIN')")
    public TrainingSession update(@PathVariable Long id,
                                  @RequestBody TrainingSession session,
                                  Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        TrainingSession existing = sessionService.findById(id);
        if (!isCaptainOfSession(me, existing)) {
            throw new AccessDeniedException("You are not authorized to modify this session.");
        }
        return sessionService.update(id, session);
    }

    /** PATCH /api/sessions/{id}/status  body: {"status":"COMPLETED"} */
    @PatchMapping("/sessions/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_CAPTAIN')")
    public ResponseEntity<Void> updateStatus(@PathVariable Long id,
                                             @RequestBody Map<String, String> body,
                                             Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        TrainingSession existing = sessionService.findById(id);
        if (!isCaptainOfSession(me, existing)) {
            throw new AccessDeniedException("You are not authorized to modify this session status.");
        }
        sessionService.updateStatus(id, TrainingSession.SessionStatus.valueOf(body.get("status")));
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/sessions/{id} */
    @DeleteMapping("/sessions/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_CAPTAIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSession(@PathVariable Long id, Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        TrainingSession existing = sessionService.findById(id);
        if (!isCaptainOfSession(me, existing)) {
            throw new AccessDeniedException("You are not authorized to delete this session.");
        }
        sessionService.delete(id);
    }

    private TrainingSession buildSession(Map<String, Object> body) {
        TrainingSession s = new TrainingSession();
        s.setTitle((String) body.get("title"));
        if (body.get("sessionDate") != null)
            s.setSessionDate(java.time.LocalDate.parse(body.get("sessionDate").toString()));
        if (body.get("startTime") != null)
            s.setStartTime(java.time.LocalTime.parse(body.get("startTime").toString()));
        if (body.get("endTime") != null)
            s.setEndTime(java.time.LocalTime.parse(body.get("endTime").toString()));
        if (body.get("notes") != null)
            s.setNotes(body.get("notes").toString());
        return s;
    }
}