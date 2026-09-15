package com.sportscamp.attendance.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * System user — either ROLE_ADMIN or ROLE_CAPTAIN.
 * Passwords are always stored BCrypt-hashed.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_seq")
    @SequenceGenerator(name = "user_seq", sequenceName = "user_id_seq", allocationSize = 1)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    /**
     * Direct link to the PLAYER record this login belongs to (captains are players).
     * Populated on promotion; used to resolve a captain's sport without relying on
     * the email/fullName heuristic. May be null for legacy accounts.
     */
    @Column(name = "player_id")
    private Long playerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    public enum Role {
        ROLE_ADMIN,
        ROLE_CAPTAIN
    }
}
