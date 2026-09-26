package com.sportscamp.attendance.repository;

import com.sportscamp.attendance.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {

    @Query("""
            SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.sports
            WHERE p.active = true AND EXISTS (
                SELECT 1 FROM Player member JOIN member.sports sp
                WHERE member.id = p.id AND sp.id = :sportId
            )
            """)
    List<Player> findBySportIdAndActiveTrue(@Param("sportId") Long sportId);

    @Query("""
            SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.sports
            WHERE EXISTS (
                SELECT 1 FROM Player member JOIN member.sports sp
                WHERE member.id = p.id AND sp.id = :sportId
            )
            """)
    List<Player> findBySportId(@Param("sportId") Long sportId);

    @Query("SELECT COUNT(DISTINCT p) FROM Player p JOIN p.sports sp WHERE sp.id = :sportId AND p.active = true")
    long countBySportIdAndActiveTrue(@Param("sportId") Long sportId);

    @Query("SELECT COUNT(DISTINCT p) FROM Player p JOIN p.sports sp WHERE sp.id = :sportId")
    long countBySportId(@Param("sportId") Long sportId);

    @Query("""
            SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.sports
            WHERE EXISTS (
                SELECT 1 FROM Player member JOIN member.sports sp
                WHERE member.id = p.id AND sp.id IN :sportIds
            )
            """)
    List<Player> findBySportIdIn(@Param("sportIds") List<Long> sportIds);

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.sports")
    List<Player> findAll();

    @Query("SELECT p.id FROM Player p WHERE LOWER(p.fullName) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY CASE WHEN LOWER(p.fullName) = LOWER(:name) THEN 0 ELSE 1 END, p.fullName")
    List<Long> findMatchingPlayerIds(@Param("name") String name, Pageable pageable);

    @Query("SELECT DISTINCT p FROM Player p LEFT JOIN FETCH p.sports WHERE p.id IN :ids")
    List<Player> findWithSportsByIdIn(@Param("ids") List<Long> ids);

    @Query("SELECT p.fullName FROM Player p WHERE LOWER(p.fullName) = LOWER(:fullName)")
    List<String> findNamesIgnoreCase(@Param("fullName") String fullName);

    /**
     * Bridge a player to their User login account: captains are players, and the email
     * column on both tables is the shared key in the current interim captaincy model.
     */
    Optional<Player> findByEmailIgnoreCase(String email);

    Optional<Player> findByFullNameIgnoreCase(String fullName);
}