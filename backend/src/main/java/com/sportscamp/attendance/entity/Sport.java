package com.sportscamp.attendance.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A sport program (e.g. Football, Cricket, Basketball, Athletics).
 * Each sport can have up to 3 player-captains who manage players, sessions, and attendance.
 */
@Entity
@Table(name = "sports",
       uniqueConstraints = @UniqueConstraint(name = "uk_sport_name", columnNames = "name"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sport_seq")
    @SequenceGenerator(name = "sport_seq", sequenceName = "sport_id_seq", allocationSize = 1)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Player-captains for this sport (owning side of the {@code sport_captains} join table).
     * A sport has up to 3 captains; the same player may captain several sports.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "sport_captains",
        joinColumns = @JoinColumn(name = "sport_id"),
        inverseJoinColumns = @JoinColumn(name = "player_id")
    )
    @JsonIgnoreProperties({"sports", "attendances", "evaluations", "hibernateLazyInitializer", "handler"})
    @Builder.Default
    private Set<Player> captains = new HashSet<>();

    /**
     * Back-reference: players who participate in this sport. Owned by {@link Player#getSports()};
     * mutate it through {@link Player#addSport(Sport)} / {@link Player#removeSport(Sport)}.
     */
    @JsonIgnore
    @ManyToMany(mappedBy = "sports")
    @Builder.Default
    private List<Player> players = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "sport", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TrainingSession> trainingSessions = new ArrayList<>();

    /**
     * Check if a player is one of the captains of this sport.
     */
    public boolean hasCaptain(Player captain) {
        if (captain == null) return false;
        return captains != null && captains.stream().anyMatch(c -> c.getId().equals(captain.getId()));
    }

    /**
     * Check if the player with the given id is one of the captains of this sport.
     */
    public boolean hasCaptainByPlayerId(Long playerId) {
        if (playerId == null) return false;
        return captains != null && captains.stream().anyMatch(c -> playerId.equals(c.getId()));
    }

    /**
     * Get the first captain, or null if no captains assigned.
     * Not serialized: captains are exposed via {@link #getCaptains()}, and a Player value here
     * would re-enter the {@code sports}/{@code captains} serialization graph.
     */
    @JsonIgnore
    public Player getPrimaryCaptain() {
        if (captains == null || captains.isEmpty()) return null;
        return captains.iterator().next();
    }
}