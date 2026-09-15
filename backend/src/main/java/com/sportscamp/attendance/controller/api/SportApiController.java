package com.sportscamp.attendance.controller.api;

import com.sportscamp.attendance.dto.SportOverviewDTO;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.Sport;
import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.exception.DuplicateResourceException;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.service.PlayerService;
import com.sportscamp.attendance.service.SportService;
import com.sportscamp.attendance.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sports")
@RequiredArgsConstructor
public class SportApiController {

    private final SportService sportService;
    private final UserService userService;
    private final PlayerService playerService;

    @GetMapping
    public List<Sport> listAll() {
        return sportService.findAll();
    }

    @GetMapping("/active")
    public List<Sport> listActive() {
        return sportService.findAllActive();
    }

    /** GET /api/sports/overview — admin dashboard: active sports, roster counts, and their captains */
    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public List<SportOverviewDTO> overview() {
        return sportService.getOverview();
    }

    /** GET /api/sports/my — returns sports assigned to the logged in captain, or all for admin */
    @GetMapping("/my")
    public List<Sport> listMySports(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return List.of();
        }
        User user = userService.findByUsername(auth.getName());
        return playerService.findCaptainSports(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sport> getById(@PathVariable Long id, Authentication auth) {
        Sport sport = sportService.findById(id);
        if (auth != null && auth.isAuthenticated()) {
            User user = userService.findByUsername(auth.getName());
            if (user.getRole() == User.Role.ROLE_CAPTAIN && !playerService.isCaptainOfSport(user, sport)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        return ResponseEntity.ok(sport);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Sport sport) {
        if (sport.getName() == null || sport.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sport name is required"));
        }
        try {
            Sport created = sportService.save(sport);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (DuplicateResourceException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public Sport update(@PathVariable Long id, @RequestBody Sport sport) {
        return sportService.update(id, sport);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public Sport patchSport(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Sport sport = sportService.findById(id);
        if (body.containsKey("name") && body.get("name") != null) {
            sport.setName(body.get("name").toString().trim());
        }
        if (body.containsKey("description")) {
            sport.setDescription(body.get("description") != null ? body.get("description").toString().trim() : null);
        }
        if (body.containsKey("active") && body.get("active") != null) {
            sport.setActive(Boolean.parseBoolean(body.get("active").toString()));
        }
        return sportService.update(id, sport);
    }

    /**
     * POST /api/sports/{id}/captain  body: {"captainId": 2}
     * Adds one player-captain to the sport (captainId is a PLAYER id). Fails if the sport
     * already has 3 captains.
     */
    @PostMapping("/{id}/captain")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> assignCaptain(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (body == null || !body.containsKey("captainId") || body.get("captainId") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Captain ID is required"));
        }
        try {
            Long captainPlayerId = Long.valueOf(body.get("captainId").toString());
            Player captain = playerService.findById(captainPlayerId);
            Sport sport = sportService.assignCaptain(id, captain);
            return ResponseEntity.ok(sport);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * DELETE /api/sports/{id}/captain/{captainId}
     * Removes one captain (player id) from the sport.
     */
    @DeleteMapping("/{id}/captain/{captainId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> removeCaptain(@PathVariable Long id, @PathVariable Long captainId) {
        try {
            Sport sport = sportService.removeCaptain(id, captainId);
            return ResponseEntity.ok(sport);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * POST /api/sports/{sportId}/captains/{playerId}
     * Promotes a player to captain of a sport (multi-sport captaincy is allowed). Allowed
     * for admins and the sport's existing captains. Returns 400 if the sport already has
     * its full allotment of captains.
     */
    @PostMapping("/{sportId}/captains/{playerId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")
    public ResponseEntity<?> promotePlayerToCaptain(@PathVariable Long sportId,
                                                    @PathVariable Long playerId,
                                                    Authentication auth) {
        User me = userService.findByUsername(auth.getName());
        if (!playerService.isCaptain(me, sportId)) {
            throw new AccessDeniedException("You are not authorized to manage captains for this sport.");
        }
        Player player = playerService.findById(playerId);
        boolean memberOfSport = player.getSports().stream().anyMatch(s -> s.getId().equals(sportId));
        if (!memberOfSport) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Player is not part of this sport."));
        }
        try {
            sportService.assignCaptain(sportId, player);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of(
                "sportId", sportId,
                "playerId", playerId,
                "message", "Player promoted to captain."
        ));
    }

    /** DELETE /api/sports/{id} */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSport(@PathVariable Long id) {
        sportService.delete(id);
    }
}