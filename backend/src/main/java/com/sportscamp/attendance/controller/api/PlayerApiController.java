package com.sportscamp.attendance.controller.api;

import com.sportscamp.attendance.dto.PlayerCreateRequest;
import com.sportscamp.attendance.dto.PlayerProfileDTO;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.Sport;
import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.service.PlayerService;
import com.sportscamp.attendance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PlayerApiController {

    private final PlayerService playerService;
    private final UserService userService;

    private boolean isCaptainOfSport(User user, Long sportId) {
        return playerService.isCaptain(user, sportId);
    }

    private boolean isCaptainOfPlayer(User user, Player player) {
        return playerService.canManage(user, player);
    }

    /** Sport ids captained by the user (all active sports for an admin). */
    private Set<Long> authorizedSportIds(User user) {
        return playerService.findCaptainSports(user).stream().map(Sport::getId).collect(Collectors.toSet());
    }

    private void assertSportsInScope(User me, Set<Long> sportIds) {
        if (me.getRole() == User.Role.ROLE_ADMIN || sportIds == null || sportIds.isEmpty()) return;
        Set<Long> authorized = authorizedSportIds(me);
        Set<Long> outOfScope = sportIds.stream().filter(id -> !authorized.contains(id)).collect(Collectors.toSet());
        if (!outOfScope.isEmpty()) {
            throw new AccessDeniedException(
                    "You are not authorized to assign players to sport(s) " + outOfScope + ".");
        }
    }

    /** GET /api/sports/{sportId}/players */
    @GetMapping("/sports/{sportId}/players")
    public ResponseEntity<List<Player>> listBySport(@PathVariable Long sportId, Authentication auth) {
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            if (!isCaptainOfSport(me, sportId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(playerService.findAllBySport(sportId));
    }

    /** GET /api/players — all players across all sports (admins and captains share the full directory) */
    @GetMapping("/players")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public ResponseEntity<List<Player>> listAll() {
        return ResponseEntity.ok(playerService.findAllPlayers());
    }

    /**
     * POST /api/players — register a player with one or more sports.
     * body: PlayerCreateRequest {fullName, ..., sportIds: [1, 5]}
     */
    @PostMapping("/players")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public ResponseEntity<?> createPlayer(@RequestBody PlayerCreateRequest req, Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        // At least one sport membership is required (enforced in PlayerService.createPlayer).
        assertSportsInScope(me, req.sportIds());
        try {
            Player created = playerService.createPlayer(null, req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** GET /api/players/{id} */
    @GetMapping("/players/{id}")
    public ResponseEntity<Player> getById(@PathVariable Long id, Authentication auth) {
        Player player = playerService.findById(id);
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            if (!isCaptainOfPlayer(me, player)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(player);
    }

    /** GET /api/players/{id}/profile — unified player profile (contact, department, sports, captaincy) */
    @GetMapping("/players/{id}/profile")
    public ResponseEntity<PlayerProfileDTO> getProfile(@PathVariable Long id, Authentication auth) {
        Player player = playerService.findById(id);
        if (auth != null && auth.isAuthenticated()) {
            User me = userService.findByUsername(auth.getName());
            if (!isCaptainOfPlayer(me, player)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(playerService.getProfile(id));
    }

    /** POST /api/sports/{sportId}/players — register a player, primarily into the path sport */
    @PostMapping("/sports/{sportId}/players")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public ResponseEntity<?> addPlayer(@PathVariable Long sportId,
                                       @RequestBody PlayerCreateRequest req,
                                       Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        if (!isCaptainOfSport(me, sportId)) {
            throw new AccessDeniedException("You are not authorized to add players to this sport.");
        }
        assertSportsInScope(me, req.sportIds());
        try {
            Player created = playerService.createPlayer(sportId, req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** PUT /api/players/{id} — update profile fields and (when provided) sport memberships */
    @PutMapping("/players/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public Player update(@PathVariable Long id,
                         @RequestBody PlayerCreateRequest req,
                         Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        Player existing = playerService.findById(id);
        if (!isCaptainOfPlayer(me, existing)) {
            throw new AccessDeniedException("You are not authorized to modify this player.");
        }
        assertSportsInScope(me, req.sportIds());
        return playerService.update(id, req);
    }

    /** DELETE /api/players/{id} */
    @DeleteMapping("/players/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlayer(@PathVariable Long id, Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        Player existing = playerService.findById(id);
        if (!playerService.canDeleteRosterEntry(me, existing)) {
            throw new AccessDeniedException("You are not authorized to delete this player.");
        }
        playerService.delete(id);
    }

    /**
     * POST /api/sports/{sportId}/players/{playerId}/promote-captain (legacy admin flow)
     * Promotes the given player to captain of the sport. Captaincy attaches to the player;
     * a username/password (optional) still creates/reuses a ROLE_CAPTAIN login account for them.
     * body: {"username":"new_captain","password":"adminchosenpass"}
     */
    @PostMapping("/sports/{sportId}/players/{playerId}/promote-captain")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public ResponseEntity<?> promoteToCaptain(
            @PathVariable Long sportId,
            @PathVariable Long playerId,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        Player player = playerService.findById(playerId);
        if (!isCaptainOfPlayer(me, player)) {
            throw new AccessDeniedException("You are not authorized to manage this player.");
        }
        if (!playerService.isCaptain(me, sportId)) {
            throw new AccessDeniedException("You are not authorized to manage captains for this sport.");
        }
        String username = body == null ? null : (body.get("username") != null ? body.get("username").toString() : null);
        String password = body == null ? null : (body.get("password") != null ? body.get("password").toString() : null);
        try {
            Player promoted = playerService.promoteToCaptain(playerId, sportId, username, password);
            Map<String, Object> result = new HashMap<>();
            result.put("captain", promoted);
            result.put("message", "Player is now a captain of the sport.");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * POST /api/sports/{sportId}/players/{playerId}/demote
     * Removes the player from the sport's captains list.
     */
    @PostMapping("/sports/{sportId}/players/{playerId}/demote")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> demote(
            @PathVariable Long sportId,
            @PathVariable Long playerId,
            Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        Player player = playerService.findById(playerId);
        if (!isCaptainOfPlayer(me, player)) {
            throw new AccessDeniedException("You are not authorized to manage this player.");
        }
        playerService.demoteFromCaptain(playerId, sportId);
        return ResponseEntity.noContent().build();
    }
}