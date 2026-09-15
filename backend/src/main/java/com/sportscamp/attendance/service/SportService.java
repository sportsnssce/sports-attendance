package com.sportscamp.attendance.service;

import com.sportscamp.attendance.dto.SportOverviewDTO;
import com.sportscamp.attendance.entity.Player;
import com.sportscamp.attendance.entity.Sport;
import com.sportscamp.attendance.exception.DuplicateResourceException;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.repository.PlayerRepository;
import com.sportscamp.attendance.repository.SportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SportService {

    private static final int MAX_CAPTAINS_PER_SPORT = 3;

    private final SportRepository sportRepository;
    private final PlayerRepository playerRepository;

    public List<Sport> findAll() {
        return sportRepository.findAllWithCaptains();
    }

    public List<Sport> findAllActive() {
        return sportRepository.findByActiveTrue();
    }

    public Sport findById(Long id) {
        return sportRepository.findByIdWithCaptains(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sport", id));
    }

    /** Sports where the given PLAYER is a captain. */
    public List<Sport> findByCaptainId(Long playerId) {
        return sportRepository.findByCaptainId(playerId);
    }

    @Transactional
    public Sport save(Sport sport) {
        if (sportRepository.existsByNameIgnoreCase(sport.getName())) {
            throw new DuplicateResourceException("Sport already exists: " + sport.getName());
        }
        return sportRepository.save(sport);
    }

    @Transactional
    public Sport update(Long id, Sport updated) {
        Sport existing = findById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setActive(updated.isActive());
        return sportRepository.save(existing);
    }

    /**
     * Add a player as a captain of a sport. Fails if the sport already has
     * {@value #MAX_CAPTAINS_PER_SPORT} captains. A player may captain multiple sports.
     */
    @Transactional
    public Sport assignCaptain(Long sportId, Player captain) {
        Sport sport = findById(sportId);
        if (sport.getCaptains().size() >= MAX_CAPTAINS_PER_SPORT) {
            throw new IllegalStateException(
                    "Sport \"" + sport.getName() + "\" already has " + MAX_CAPTAINS_PER_SPORT
                    + " captains. Remove one before adding another.");
        }
        if (sport.getCaptains().stream().anyMatch(c -> c.getId().equals(captain.getId()))) {
            return sport; // already a captain of this sport
        }
        sport.getCaptains().add(captain);
        return sportRepository.save(sport);
    }

    /**
     * Remove a captain (player id) from a sport.
     */
    @Transactional
    public Sport removeCaptain(Long sportId, Long captainPlayerId) {
        Sport sport = findById(sportId);
        sport.getCaptains().removeIf(c -> c.getId().equals(captainPlayerId));
        return sportRepository.save(sport);
    }

    /**
     * Is the given player a captain of the given sport?
     */
    public boolean isCaptain(Long sportId, Long playerId) {
        return sportRepository.findByIdWithCaptains(sportId)
                .map(s -> s.hasCaptainByPlayerId(playerId))
                .orElse(false);
    }

    /**
     * Admin overview: all active sports with their roster counts and assigned player-captains.
     */
    public List<SportOverviewDTO> getOverview() {
        return sportRepository.findByActiveTrue().stream()
                .map(sport -> {
                    List<SportOverviewDTO.CaptainInfo> captains = sport.getCaptains().stream()
                            .map(c -> new SportOverviewDTO.CaptainInfo(c.getId(), c.getFullName(), c.getEmail()))
                            .toList();
                    long totalPlayers = playerRepository.countBySportId(sport.getId());
                    return new SportOverviewDTO(
                            sport.getId(),
                            sport.getName(),
                            sport.getDescription(),
                            sport.isActive(),
                            totalPlayers,
                            captains
                    );
                })
                .toList();
    }

    @Transactional
    public void delete(Long id) {
        Sport sport = findById(id);
        sportRepository.delete(sport);
    }
}