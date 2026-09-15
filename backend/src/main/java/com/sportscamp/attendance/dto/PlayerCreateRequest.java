package com.sportscamp.attendance.dto;

import java.time.LocalDate;
import java.util.Set;

/**
 * Request body for creating or updating a player. {@code sportIds} is nullable:
 * on create it is REQUIRED to yield at least one sport (a primary path-variable sport is
 * merged by the controller when present, otherwise {@code sportIds} must not be empty);
 * on update {@code null} means "leave memberships untouched", whereas a provided (possibly
 * empty) set replaces the player's sport memberships.
 */
public record PlayerCreateRequest(
        String fullName,
        LocalDate dateOfBirth,
        Integer jerseyNumber,
        String position,
        String phone,
        String email,
        String department,
        String notes,
        Boolean active,
        Set<Long> sportIds
) {
}