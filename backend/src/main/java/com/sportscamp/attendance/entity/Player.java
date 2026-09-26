package com.sportscamp.attendance.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * An athlete who can participate in multiple sports.
 * Sports are linked many-to-many via the {@code player_sports} join table
 * (owns the join), and the player is the owner of that relationship.
 */
@Entity
@Table(name = "players")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Player extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "player_seq")
    @SequenceGenerator(name = "player_seq", sequenceName = "player_id_seq", allocationSize = 1)
    private Long id;

    @Column(nullable = false, length = 150)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "jersey_number")
    private Integer jerseyNumber;

    @Column(length = 200)
    private String position;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(length = 100)
    private String department;

    @Column(name = "academic_year", length = 30)
    private String year;

    @Column(length = 500)
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Sports this player participates in (owning side of the {@code player_sports} join table).
     */
    @ManyToMany
    @JoinTable(
        name = "player_sports",
        joinColumns = @JoinColumn(name = "player_id"),
        inverseJoinColumns = @JoinColumn(name = "sport_id")
    )
    @JsonIgnoreProperties({"players", "captains", "trainingSessions", "hibernateLazyInitializer"})
    @Builder.Default
    private Set<Sport> sports = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "player", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Attendance> attendances = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "player", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PlayerEvaluation> evaluations = new ArrayList<>();

    /**
     * Join this player to a sport (keeps both sides of the relationship in sync).
     */
    public void addSport(Sport sport) {
        if (sport != null && this.sports.add(sport)) {
            sport.getPlayers().add(this);
        }
    }

    /**
     * Remove this player from a sport (keeps both sides of the relationship in sync).
     */
    public void removeSport(Sport sport) {
        if (sport != null && this.sports.remove(sport)) {
            sport.getPlayers().remove(this);
        }
    }

    /**
     * Backward-compatible convenience: id of the first ("primary") sport, or null when the
     * player has no sports. Players are multi-sport now, so callers should treat this as a
     * display hint only (Phase 2+ should replace it with an explicit list of sport ids).
     */
    @com.fasterxml.jackson.annotation.JsonProperty("sportId")
    public Long getSportId() {
        return sports.isEmpty() ? null : sports.iterator().next().getId();
    }
}