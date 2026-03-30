package com.example.library.service;

import com.example.library.dto.auth.AuthContextDto;
import com.example.library.dto.user.UserCreateDto;
import com.example.library.dto.user.UserDto;
import com.example.library.dto.user.UserProfileDto;
import com.example.library.dto.user.ProfileUpdateDto;
import com.example.library.dto.user.UserUpdateDto;
import com.example.library.entity.Permission;
import com.example.library.entity.Role;
import com.example.library.entity.User;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

/**
 * User management service.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;

    /**
     * Returns all users (paginated).
     */
    public Page<UserDto> getAllUsers(int page, int size) {
        return userRepository.findAll(PageRequest.of(page, size))
                .map(this::convertToDto);
    }

    /**
     * Returns users with optional keyword/role/status filtering (paginated).
     */
    public Page<UserDto> getAllUsers(
            int page,
            int size,
            String keyword,
            String roleKeyword,
            User.UserStatus status) {

        Specification<User> spec = Specification.where(null);

        if (keyword != null && !keyword.trim().isEmpty()) {
            String normalized = "%" + keyword.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("username")), normalized),
                    cb.like(cb.lower(root.get("fullName")), normalized),
                    cb.like(cb.lower(root.get("email")), normalized)));
        }

        if (roleKeyword != null && !roleKeyword.trim().isEmpty()) {
            String normalizedRole = roleKeyword.trim().toUpperCase();
            User.UserRole baseRole = User.UserRole.fromString(normalizedRole);

            spec = spec.and((root, query, cb) -> {
                query.distinct(true);
                Join<User, Role> roleJoin = root.join("roles", JoinType.LEFT);
                Predicate dynamicRoleMatch = cb.equal(cb.upper(roleJoin.get("name")), normalizedRole);

                if (baseRole != null) {
                    Predicate baseRoleMatch = cb.equal(root.get("role"), baseRole);

                    return cb.or(baseRoleMatch, dynamicRoleMatch);
                }

                return dynamicRoleMatch;
            });
        }

        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        return userRepository.findAll(spec, PageRequest.of(page, size))
                .map(this::convertToDto);
    }

    /**
     * Returns all users (non-paginated, for internal use).
     */
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Returns a user by id.
     */
    public UserDto getUserById(int id) {
        return userRepository.findById(id)
                .map(this::convertToDto)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    /**
     * Returns a user by username.
     */
    public UserDto getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(this::convertToDto)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
    }

    /**
     * Returns auth context (base profile + roles + permissions) by username.
     */
    public AuthContextDto getAuthContextByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return convertToAuthContextDto(user);
    }

    /**
     * Returns user profile (full personal info) by username.
     */
    public UserProfileDto getUserProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return convertToProfileDto(user);
    }

    /**
     * Updates the current user's personal profile.
     */
    @Transactional
    public UserProfileDto updateProfile(String username, ProfileUpdateDto dto) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));

        if (dto.getFullName() != null) {
            user.setFullName(dto.getFullName());
        }

        if (dto.getEmail() != null && !user.getEmail().equals(dto.getEmail())) {
            if (userRepository.existsByEmail(dto.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(dto.getEmail());
        }

        if (dto.getDepartment() != null) {
            user.setDepartment(dto.getDepartment());
        }

        if (dto.getMajor() != null) {
            user.setMajor(dto.getMajor());
        }

        if (dto.getEnrollmentYear() != null) {
            user.setEnrollmentYear(dto.getEnrollmentYear());
        }

        if (dto.getInterestTags() != null) {
            user.setInterestTags(String.join(",", dto.getInterestTags()));
        }

        User saved = userRepository.save(user);
        return convertToProfileDto(saved);
    }

    /**
     * Creates a new user.
     */
    @Transactional
    public UserDto createUser(UserCreateDto userCreateDto) {
        if (userRepository.existsByUsername(userCreateDto.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }

        if (userRepository.existsByEmail(userCreateDto.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User();
        user.setUsername(userCreateDto.getUsername());
        user.setEmail(userCreateDto.getEmail());
        user.setFullName(userCreateDto.getFullName());
        user.setPasswordHash(passwordEncoder.encode(userCreateDto.getPassword()));
        user.setRole(User.UserRole.USER);
        user.setStatus(User.UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);
        return convertToDto(savedUser);
    }

    /**
     * Updates a user.
     */
    @Transactional
    @SuppressWarnings("null")
    public UserDto updateUser(int id, UserUpdateDto userUpdateDto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (userUpdateDto.getFullName() != null) {
            user.setFullName(userUpdateDto.getFullName());
        }

        if (userUpdateDto.getEmail() != null && !user.getEmail().equals(userUpdateDto.getEmail())) {
            if (userRepository.existsByEmail(userUpdateDto.getEmail())) {
                throw new IllegalArgumentException("Email already exists");
            }
            user.setEmail(userUpdateDto.getEmail());
        }

        if (userUpdateDto.getRole() != null) {
            user.setRole(userUpdateDto.getRole());
        }

        if (userUpdateDto.getStatus() != null) {
            user.setStatus(userUpdateDto.getStatus());
            if (userUpdateDto.getStatus() == User.UserStatus.INACTIVE) {
                invalidateTokens(user);
            }
        }

        if (userUpdateDto.getPassword() != null) {
            if (userUpdateDto.getPassword().length() < 8) {
                throw new IllegalArgumentException("Password must be at least 8 characters long");
            }
            if (userUpdateDto.getOldPassword() == null) {
                throw new IllegalArgumentException("Old password is required to change password");
            }
            if (!passwordEncoder.matches(userUpdateDto.getOldPassword(), user.getPasswordHash())) {
                throw new IllegalArgumentException("Old password is incorrect");
            }

            user.setPasswordHash(passwordEncoder.encode(userUpdateDto.getPassword()));
            invalidateTokens(user);
        }

        User updatedUser = userRepository.save(user);
        return convertToDto(updatedUser);
    }

    /**
     * Deactivates a user.
     */
    @Transactional
    public void deleteUser(int id) {
        updateUserStatus(id, User.UserStatus.INACTIVE);
    }

    /**
     * Updates a user's active/inactive status from the admin workflow.
     */
    @Transactional
    public UserDto updateUserStatus(int id, User.UserStatus status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setStatus(status);
        if (status == User.UserStatus.INACTIVE) {
            invalidateTokens(user);
        }

        return convertToDto(userRepository.save(user));
    }

    /**
     * Updates a user's identity type from the admin workflow.
     */
    @Transactional
    public UserDto updateUserIdentityType(int id, User.IdentityType identityType) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setIdentityType(identityType);

        return convertToDto(userRepository.save(user));
    }

    /**
     * Invalidates all currently issued tokens for a user by id.
     */
    @Transactional
    public void invalidateTokensForUserId(int id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        invalidateTokens(user);
        userRepository.save(user);
    }

    private UserDto convertToDto(User user) {
        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());
        dto.setCreateTime(user.getCreateTime());
        dto.setUpdateTime(user.getUpdateTime());
        dto.setRoles(extractRoleNames(user).stream().toList());
        dto.setPermissions(extractPermissionNames(user));
        dto.setDepartment(user.getDepartment());
        dto.setMajor(user.getMajor());
        dto.setIdentityType(user.getIdentityType());
        dto.setEnrollmentYear(user.getEnrollmentYear());
        if (user.getInterestTags() != null && !user.getInterestTags().isBlank()) {
            dto.setInterestsTag(Arrays.stream(user.getInterestTags().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList());
        } else {
            dto.setInterestsTag(List.of());
        }
        return dto;
    }

    private UserProfileDto convertToProfileDto(User user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());
        dto.setDepartment(user.getDepartment());
        dto.setMajor(user.getMajor());
        dto.setIdentityType(user.getIdentityType());
        dto.setEnrollmentYear(user.getEnrollmentYear());
        dto.setCreateTime(user.getCreateTime());
        dto.setUpdateTime(user.getUpdateTime());
        dto.setRoles(extractRoleNames(user).stream().toList());
        dto.setPermissions(extractPermissionNames(user));

        // Parse comma-separated interestTags string into a list
        if (user.getInterestTags() != null && !user.getInterestTags().isBlank()) {
            dto.setInterestTags(Arrays.stream(user.getInterestTags().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList()));
        } else {
            dto.setInterestTags(List.of());
        }

        return dto;
    }

    private AuthContextDto convertToAuthContextDto(User user) {
        AuthContextDto dto = new AuthContextDto();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setStatus(user.getStatus());

        Set<String> roles = extractRoleNames(user);
        List<String> permissions = extractPermissionNames(user);

        dto.setRoles(roles.stream().toList());
        dto.setPermissions(permissions);
        dto.setRole(resolvePrimaryRole(roles));

        return dto;
    }

    private Set<String> extractRoleNames(User user) {
        LinkedHashSet<String> roles = new LinkedHashSet<>();

        if (user.getRole() != null) {
            roles.add(user.getRole().name());
        }

        for (Role dynamicRole : user.getRoles()) {
            if (dynamicRole.getName() != null && !dynamicRole.getName().isBlank()) {
                roles.add(dynamicRole.getName().toUpperCase());
            }
        }

        if (roles.isEmpty()) {
            roles.add(User.UserRole.USER.name());
        }

        return roles;
    }

    private List<String> extractPermissionNames(User user) {
        LinkedHashSet<String> permissions = new LinkedHashSet<>();

        for (Role dynamicRole : user.getRoles()) {
            for (Permission permission : dynamicRole.getPermissions()) {
                if (permission.getName() != null && !permission.getName().isBlank()) {
                    permissions.add(permission.getName());
                }
            }
        }

        return permissions.stream().toList();
    }

    private String resolvePrimaryRole(Set<String> roles) {
        if (roles.contains(User.UserRole.ADMIN.name())) {
            return User.UserRole.ADMIN.name();
        }

        return roles.stream().findFirst().orElse(User.UserRole.USER.name());
    }

    private void invalidateTokens(User user) {
        user.setTokenValidAfter(LocalDateTime.now());
        if (user.getUserId() != null) {
            refreshTokenService.revokeAllUserTokens(user.getUserId());
        }
    }
}
