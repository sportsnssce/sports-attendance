package com.sportscamp.attendance.service;

import com.sportscamp.attendance.dto.PlayerCreateRequest;
import com.sportscamp.attendance.dto.PlayerProfileDTO;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.Sport;
import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final SportService sportService;

    public List<Player> findActiveBySport(Long sportId) {
        return playerRepository.findBySportIdAndActiveTrue(sportId);
    }

    public List<Player> findAllBySport(Long sportId) {
        return playerRepository.findBySportId(sportId);
    }

    public List<Player> findAllBySports(List<Long> sportIds) {
        return playerRepository.findBySportIdIn(sportIds);
    }

    public List<Player> findAllPlayers() {
        return playerRepository.findAll();
    }

    public Player findById(Long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player", id));
    }

    /**
     * Resolve a player by email (case-insensitive).
     */
    public Optional<Player> findByEmail(String email) {
        if (email == null || email.isBlank()) return Optional.empty();
        return playerRepository.findByEmailIgnoreCase(email);
    }

    /**
     * Resolve a player by email or fullName (case-insensitive). Captains are stored as PLAYERS,
     * but login is still USER-based, so the shared email or fullName bridges a logged-in user
     * to their player record in the current interim captaincy model.
     */
    public Optional<Player> findByEmailOrFullName(User user) {
        if (user == null) return Optional.empty();
        return findByEmail(user.getEmail())
                .or(() -> playerRepository.findByFullNameIgnoreCase(user.getFullName()));
    }

    /**
     * Register a player and attach them to sports.
     *
     * @param primarySportId id from the request path ({@code null} for the generic create
     *                       endpoint); merged with the request's {@code sportIds}.
     * @param req            flat player fields + optional additional {@code sportIds}.
     */
    @Transactional
    public Player createPlayer(Long primarySportId, PlayerCreateRequest req) {
        Set<Long> sportIds = new LinkedHashSet<>();
        if (primarySportId != null) sportIds.add(primarySportId);
        if (req.sportIds() != null) sportIds.addAll(req.sportIds());
        // Sport memberships are optional: a player may be registered with zero,
        // one, or several sports (assignment can happen later via update).

        Player player = new Player();
        applyBaseFields(player, req);
        for (Long sportId : sportIds) {
            player.addSport(sportService.findById(sportId));
        }
        return playerRepository.save(player);
    }

    /**
     * Update a player's profile fields and, when {@code req.sportIds()} is provided, replace
     * their sport memberships with exactly that set.
     */
    @Transactional
    public Player update(Long id, PlayerCreateRequest req) {
        Player existing = findById(id);
        applyBaseFields(existing, req);
        if (req.sportIds() != null) {
            syncSports(existing, new LinkedHashSet<>(req.sportIds()));
        }
        return playerRepository.save(existing);
    }

    private void syncSports(Player player, Set<Long> targetSportIds) {
        Set<Long> currentIds = player.getSports().stream().map(Sport::getId).collect(Collectors.toSet());
        for (Sport sport : Set.copyOf(player.getSports())) {
            if (!targetSportIds.contains(sport.getId())) {
                player.removeSport(sport);
            }
        }
        for (Long sportId : targetSportIds) {
            if (!currentIds.contains(sportId)) {
                player.addSport(sportService.findById(sportId));
            }
        }
    }

    private void applyBaseFields(Player player, PlayerCreateRequest req) {
        player.setFullName(req.fullName());
        player.setDateOfBirth(req.dateOfBirth());
        player.setJerseyNumber(req.jerseyNumber());
        player.setPosition(req.position());
        player.setPhone(req.phone());
        player.setEmail(req.email());
        player.setDepartment(req.department());
        player.setNotes(req.notes());
        if (req.active() != null) player.setActive(req.active());
    }

    /** Unified player profile: contact info, department, sports, and captaincy status. */
    public PlayerProfileDTO getProfile(Long id) {
        Player player = findById(id);

        List<PlayerProfileDTO.SportInfo> sports = new ArrayList<>();
        PlayerProfileDTO.SportInfo captainOf = null;
        for (Sport sport : player.getSports()) {
            PlayerProfileDTO.SportInfo info = new PlayerProfileDTO.SportInfo(sport.getId(), sport.getName());
            sports.add(info);
            if (captainOf == null && sport.hasCaptainByPlayerId(player.getId())) {
                captainOf = info;
            }
        }

        return new PlayerProfileDTO(
                player.getId(),
                player.getFullName(),
                player.getEmail(),
                player.getPhone(),
                player.getDepartment(),
                captainOf != null,
                captainOf,
                List.copyOf(sports)
        );
    }

    @Transactional
    public void deactivate(Long id) {
        Player player = findById(id);
        player.setActive(false);
        playerRepository.save(player);
    }

    @Transactional
    public void delete(Long id) {
        Player player = findById(id);
        // Remove from any sports before deleting (clean up player_sports / sport_captains rows).
        for (Sport sport : List.copyOf(player.getSports())) {
            player.removeSport(sport);
        }
        playerRepository.delete(player);
    }

    /**
     * Promotes a player to captain of a sport. Captaincy now attaches to the PLAYER directly
     * (the {@code sport_captains} join table links to {@code players}), matching the V5 schema.
     * For continuity, a ROLE_CAPTAIN {@code users} login account is still created/reused from
     * the admin-provided username/password, linked to the player via the shared email, so the
     * new captain can sign in. TODO (Phase 2): revisit whether captain login should be
     * user-account based at all once the frontend supports player-based auth.
     */
    @Transactional
    public Player promoteToCaptain(Long playerId, Long sportId, String username, String rawPassword,
                                   UserService userService) {
        Player player = findById(playerId);
        sportService.findById(sportId); // validate the sport exists before any account work

        String resolvedUsername = (username != null && !username.isBlank()) ? username.trim() : null;

        // 1) Reuse an existing captain account with the chosen username
        if (resolvedUsername != null && userService.userExistsByUsername(resolvedUsername)) {
            User existing = userService.findByUsername(resolvedUsername);
            if (existing.getRole() != User.Role.ROLE_CAPTAIN) {
                throw new IllegalStateException(
                        "Username \"" + resolvedUsername + "\" is taken by a non-captain user.");
            }
            sportService.assignCaptain(sportId, player);
            return player;
        }

        // 2) Reuse a captain account previously created from this player's email
        if (player.getEmail() != null && !player.getEmail().isBlank()
                && userService.userExistsByEmail(player.getEmail())) {
            User existing = userService.findUserByEmail(player.getEmail());
            if (existing.getRole() != User.Role.ROLE_CAPTAIN) {
                throw new IllegalStateException(
                        "User with email " + player.getEmail() + " exists but is not a captain.");
            }
            sportService.assignCaptain(sportId, player);
            return player;
        }

        // 3) Create a brand-new captain login account with the admin-provided credentials
        if (resolvedUsername == null) {
            throw new IllegalArgumentException("A username is required to create the new captain account.");
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new IllegalArgumentException("A password is required to create the new captain account.");
        }
        userService.createUser(
                resolvedUsername, rawPassword,
                player.getFullName(), player.getEmail(), player.getPhone(),
                User.Role.ROLE_CAPTAIN
        );
        sportService.assignCaptain(sportId, player);
        return player;
    }

    /**
     * Removes the player from the sport's captains list (player-centric captaincy).
     * The User login account, if any, is NOT deleted.
     */
    @Transactional
    public void demoteFromCaptain(Long playerId, Long sportId) {
        Player player = findById(playerId);
        sportService.removeCaptain(sportId, player.getId());
    }

    // ------------------------------------------------------------------
    // Interim authorization bridges (captain = Player, login = User).
    // Phase 2 should replace these once player-based auth is in place.
    // ------------------------------------------------------------------

    /**
     * Sports the given user captains, resolved through their player record (email bridge).
     * Admins see all active sports.
     */
    public List<Sport> findCaptainSports(User user) {
        if (user == null) return List.of();
        if (user.getRole() == User.Role.ROLE_ADMIN) return sportService.findAllActive();
        return findByEmailOrFullName(user)
                .map(p -> sportService.findByCaptainId(p.getId()))
                .orElse(List.of());
    }

    /**
     * Is this user a captain (or admin) of the given sport?
     */
    public boolean isCaptain(User user, Long sportId) {
        if (user == null) return false;
        if (user.getRole() == User.Role.ROLE_ADMIN) return true;
        return findByEmailOrFullName(user)
                .map(p -> sportService.isCaptain(sportId, p.getId()))
                .orElse(false);
    }

    /**
     * Is this user a captain (or admin) of the given sport object?
     */
    public boolean isCaptainOfSport(User user, Sport sport) {
        if (user == null) return false;
        if (user.getRole() == User.Role.ROLE_ADMIN) return true;
        if (sport == null) return false;
        return findByEmailOrFullName(user)
                .map(p -> sport.hasCaptainByPlayerId(p.getId()))
                .orElse(false);
    }

    /**
     * Can this user manage the given player? True for admins, or for a captain who captains at
     * least one sport the player participates in. Interim rule — revisit in Phase 2.
     */
    public boolean canManage(User user, Player target) {
        if (user == null) return false;
        if (user.getRole() == User.Role.ROLE_ADMIN) return true;
        Long myPlayerId = findByEmailOrFullName(user).map(Player::getId).orElse(null);
        if (myPlayerId == null || target == null) return false;
        return target.getSports().stream()
                .anyMatch(s -> s.hasCaptainByPlayerId(myPlayerId));
    }
}