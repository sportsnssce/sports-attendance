package com.sportscamp.attendance.service;

import com.sportscamp.attendance.entity.User;
import com.sportscamp.attendance.exception.DuplicateResourceException;
import com.sportscamp.attendance.exception.ResourceNotFoundException;
import com.sportscamp.attendance.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    public boolean userExistsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    public boolean userExistsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    public List<User> findCaptains() {
        return userRepository.findByRole(User.Role.ROLE_CAPTAIN);
    }

    public List<User> findActiveCaptains() {
        return userRepository.findByRoleAndEnabledTrue(User.Role.ROLE_CAPTAIN);
    }

    @Transactional
    public User createUser(String username, String rawPassword, String fullName,
                           String email, String phone, User.Role role, Long playerId) {
        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username already taken: " + username);
        }
        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .email(email)
                .phone(phone)
                .role(role)
                .playerId(playerId)
                .enabled(true)
                .build();
        return userRepository.save(user);
    }

    /**
     * Permanently attach this login account to the given player record. Used when a
     * captain login is created or reused, so the account always resolves to the exact
     * player who captains the sport.
     */
    @Transactional
    public User linkPlayer(Long userId, Long playerId) {
        User user = findById(userId);
        user.setPlayerId(playerId);
        return userRepository.save(user);
    }

    @Transactional
    public void resetPassword(Long userId, String newRawPassword) {
        User user = findById(userId);
        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long userId, String currentRawPassword, String newRawPassword) {
        User user = findById(userId);
        if (currentRawPassword == null || !passwordEncoder.matches(currentRawPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        if (newRawPassword == null || newRawPassword.isEmpty()) {
            throw new IllegalArgumentException("New password is required.");
        }
        user.setPasswordHash(passwordEncoder.encode(newRawPassword));
        userRepository.save(user);
    }

    @Transactional
    public void setEnabled(Long userId, boolean enabled) {
        User user = findById(userId);
        user.setEnabled(enabled);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = findById(userId);
        userRepository.delete(user);
    }

    /**
     * Rename a user's login username. Throws if the new name is already taken.
     */
    @Transactional
    public void setUsername(Long userId, String newUsername) {
        User user = findById(userId);
        String trimmed = newUsername.trim();
        if (userRepository.existsByUsername(trimmed)) {
            throw new DuplicateResourceException("Username already taken: " + trimmed);
        }
        user.setUsername(trimmed);
        userRepository.save(user);
    }

    /**
     * Find the captain login account associated with the given player.
     * First checks the explicit {@code users.player_id} link; falls back to matching
     * by email (legacy accounts created before V7).
     */
    public java.util.Optional<User> findCaptainAccountForPlayer(Long playerId, String email) {
        if (playerId != null) {
            List<User> byLink = userRepository.findByPlayerIdAndRole(playerId, User.Role.ROLE_CAPTAIN);
            if (!byLink.isEmpty()) return java.util.Optional.of(byLink.get(0));
        }
        if (email != null && !email.isBlank()) {
            List<User> byEmail = userRepository.findByEmailAndRole(email, User.Role.ROLE_CAPTAIN);
            if (!byEmail.isEmpty()) return java.util.Optional.of(byEmail.get(0));
        }
        return java.util.Optional.empty();
    }

    @Transactional
    public User updateUser(Long userId, String fullName, String email, String phone) {
        User user = findById(userId);
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName.trim());
        }
        if (email != null) {
            user.setEmail(email.isBlank() ? null : email.trim());
        }
        if (phone != null) {
            user.setPhone(phone.isBlank() ? null : phone.trim());
        }
        return userRepository.save(user);
    }
}
