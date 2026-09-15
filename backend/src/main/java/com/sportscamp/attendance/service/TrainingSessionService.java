package com.sportscamp.attendance.service;

import com.sportscamp.attendance.entity.Sport;
import com.sportscamp.attendance.entity.TrainingSession;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.repository.TrainingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TrainingSessionService {

    private static final String MORNING_TITLE_SUFFIX = " - Morning Session";
    private static final String EVENING_TITLE_SUFFIX = " - Evening Session";

    private final TrainingSessionRepository sessionRepository;
    private final SportService sportService;

    public List<TrainingSession> findBySport(Long sportId) {
        return sessionRepository.findBySportIdOrderBySessionDateAsc(sportId);
    }

    /**
     * Returns the sessions for a sport on a given date. If none exist, creates the two
     * default slots (Morning 07:00-09:00, Evening 16:30-18:30) and returns them. Idempotent.
     */
    @Transactional
    public List<TrainingSession> findBySportAndDate(Long sportId, LocalDate date) {
        sportService.findById(sportId);
        List<TrainingSession> existing = sessionRepository.findBySportIdAndSessionDate(sportId, date);
        if (existing.isEmpty()) {
            createForSport(defaultSession(date, MORNING_TITLE_SUFFIX, LocalTime.of(7, 0), LocalTime.of(9, 0)), sportId);
            createForSport(defaultSession(date, EVENING_TITLE_SUFFIX, LocalTime.of(16, 30), LocalTime.of(18, 30)), sportId);
        }
        return sessionRepository.findBySportIdAndSessionDate(sportId, date);
    }

    /** Range query for a sport — read-only, does NOT auto-generate defaults. */
    public List<TrainingSession> findBySportBetween(Long sportId, LocalDate from, LocalDate to) {
        return sessionRepository.findBySportIdAndSessionDateBetween(sportId, from, to);
    }

    private TrainingSession defaultSession(LocalDate date, String titleSuffix, LocalTime start, LocalTime end) {
        TrainingSession s = new TrainingSession();
        s.setTitle(date + titleSuffix);
        s.setSessionDate(date);
        s.setStartTime(start);
        s.setEndTime(end);
        s.setStatus(TrainingSession.SessionStatus.SCHEDULED);
        return s;
    }

    public List<TrainingSession> findAll() {
        return sessionRepository.findAllWithSport();
    }

    public TrainingSession findById(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TrainingSession", id));
    }

    @Transactional
    public TrainingSession createForSport(TrainingSession session, Long sportId) {
        Sport sport = sportService.findById(sportId);
        session.setSport(sport);
        return sessionRepository.save(session);
    }

    @Transactional
    public TrainingSession update(Long id, TrainingSession updated) {
        TrainingSession existing = findById(id);
        existing.setTitle(updated.getTitle());
        existing.setSessionDate(updated.getSessionDate());
        existing.setStartTime(updated.getStartTime());
        existing.setEndTime(updated.getEndTime());
        existing.setNotes(updated.getNotes());
        existing.setStatus(updated.getStatus());
        return sessionRepository.save(existing);
    }

    @Transactional
    public void updateStatus(Long id, TrainingSession.SessionStatus status) {
        TrainingSession session = findById(id);
        session.setStatus(status);
        sessionRepository.save(session);
    }

    @Transactional
    public void delete(Long id) {
        TrainingSession session = findById(id);
        sessionRepository.delete(session);
    }
}
