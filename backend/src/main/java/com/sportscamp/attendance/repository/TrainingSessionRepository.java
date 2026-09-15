package com.sportscamp.attendance.repository;

import com.sportscamp.attendance.entity.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {

    @Query("SELECT ts FROM TrainingSession ts LEFT JOIN FETCH ts.sport WHERE ts.sport.id = :sportId ORDER BY ts.sessionDate ASC, ts.startTime ASC")
    List<TrainingSession> findBySportIdOrderBySessionDateAsc(@Param("sportId") Long sportId);

    @Query("SELECT ts FROM TrainingSession ts LEFT JOIN FETCH ts.sport ORDER BY ts.sessionDate ASC, ts.startTime ASC")
    List<TrainingSession> findAllWithSport();

    @Query("""
            SELECT ts FROM TrainingSession ts 
            WHERE ts.sport.id = :sportId 
              AND ts.sessionDate BETWEEN :from AND :to
            """)
    List<TrainingSession> findBySportIdAndSessionDateBetween(
            @Param("sportId") Long sportId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
            SELECT ts FROM TrainingSession ts
            LEFT JOIN FETCH ts.sport
            WHERE ts.sport.id = :sportId
              AND ts.sessionDate = :date
            ORDER BY ts.startTime ASC
            """)
    List<TrainingSession> findBySportIdAndSessionDate(@Param("sportId") Long sportId, @Param("date") LocalDate date);
}