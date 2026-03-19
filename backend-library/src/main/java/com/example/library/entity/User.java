package com.example.library.entity;

import com.example.library.converter.UserRoleConverter;
import com.example.library.converter.UserStatusConverter;
import com.example.library.converter.IdentityTypeConverter;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.LinkedHashSet;

/**
 * User entity.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@ToString
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    @Convert(converter = UserRoleConverter.class)
    private UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Convert(converter = UserStatusConverter.class)
    private UserStatus status = UserStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "create_time", nullable = false, updatable = false)
    private LocalDateTime createTime;

    @UpdateTimestamp
    @Column(name = "update_time", nullable = false)
    private LocalDateTime updateTime;

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    private Set<Loan> loans = new HashSet<>();

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    private Set<Reservation> reservations = new HashSet<>();

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    private Set<Fine> fines = new HashSet<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    @ToString.Exclude
    private Set<Role> roles = new LinkedHashSet<>();

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "major", length = 100)
    private String major;

    @Column(name = "identity_type")
    @Convert(converter = IdentityTypeConverter.class)
    private IdentityType identityType = IdentityType.STUDENT;

    @Column(name = "enrollment_year")
    private Integer enrollmentYear;

    @Lob
    @Column(name = "interest_tags")
    private String interestTags;

    @Column(name = "password_reset_token_hash", length = 128)
    private String passwordResetTokenHash;

    @Column(name = "password_reset_requested_at")
    private LocalDateTime passwordResetRequestedAt;

    @Column(name = "password_reset_expires_at")
    private LocalDateTime passwordResetExpiresAt;

    @Column(name = "password_reset_used_at")
    private LocalDateTime passwordResetUsedAt;

    @Column(name = "token_valid_after")
    private LocalDateTime tokenValidAfter;

    public enum IdentityType {
        STUDENT, TEACHER, STAFF, VISITOR
    }

    public enum UserRole {
        ADMIN, USER;

        public static UserRole fromString(String role) {
            if (role == null)
                return null;
            try {
                return UserRole.valueOf(role.toUpperCase());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
    }

    public enum UserStatus {
        ACTIVE, INACTIVE;

        public static UserStatus fromString(String status) {
            if (status == null)
                return null;
            try {
                return UserStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ACTIVE;
            }
        }
    }
}
