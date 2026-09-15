package com.sportscamp.attendance.dto;

import java.util.List;

/**
 * Unified player profile. {@code isCaptain} is true when the player captains at least one
 * sport; {@code captainSports} lists every sport they lead (multi-sport captaincy is
 * supported, so the list may contain several entries).
 * {@code hasCaptainLogin} / {@code captainUsername} describe the captain login account
 * linked to this player, if one exists (null/blank when there is none).
 */
public record PlayerProfileDTO(
        Long id,
        String fullName,
        String email,
        String phone,
        String department,
        boolean isCaptain,
        List<SportInfo> captainSports,
        List<SportInfo> sports,
        boolean hasCaptainLogin,
        String captainUsername
) {
    public record SportInfo(Long id, String name) {
    }
}