package com.sportscamp.attendance.repository;

import com.sportscamp.attendance.entity.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {

    @Query("SELECT DISTINCT p FROM Player p JOIN p.sports sp WHERE sp.id = :sportId AND p.active = true")
    List<Player> findBySportIdAndActiveTrue(@Param("sportId") Long sportId);

    @Query("SELECT DISTINCT p FROM Player p JOIN p.sports sp WHERE sp.id = :sportId")
    List<Player> findBySportId(@Param("sportId") Long sportId);

    @Query("SELECT COUNT(DISTINCT p) FROM Player p JOIN p.sports sp WHERE sp.id = :sportId AND p.active = true")
    long countBySportIdAndActiveTrue(@Param("sportId") Long sportId);

    @Query("SELECT COUNT(DISTINCT p) FROM Player p JOIN p.sports sp WHERE sp.id = :sportId")
    long countBySportId(@Param("sportId") Long sportId);

    @Query("SELECT DISTINCT p FROM Player p JOIN p.sports sp WHERE sp.id IN :sportIds")
    List<Player> findBySportIdIn(@Param("sportIds") List<Long> sportIds);

    /**
     * Bridge a player to their User login account: captains are players, and the email
     * column on both tables is the shared key in the current interim captaincy model.
     */
    Optional<Player> findByEmailIgnoreCase(String email);

    Optional<Player> findByFullNameIgnoreCase(String fullName);
}