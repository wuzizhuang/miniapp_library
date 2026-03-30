package com.example.library.security;

import com.example.library.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;

/**
 * UserDetails implementation backed by the User entity.
 */
@Data
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private Integer id;
    private String username;
    private String email;
    @JsonIgnore
    private String password;
    private String fullName;
    private LocalDateTime tokenValidAfter;
    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(
            Integer id,
            String username,
            String email,
            String password,
            String fullName,
            Collection<? extends GrantedAuthority> authorities) {
        this(id, username, email, password, fullName, null, authorities);
    }

    /**
     * Builds a UserDetails instance from a User entity.
     * Authorities include:
     * <ul>
     * <li>ROLE_{ENUM} — from the legacy User.UserRole field (e.g. ROLE_ADMIN)</li>
     * <li>ROLE_{NAME} — from dynamically assigned Role entities (e.g.
     * ROLE_CATALOGER)</li>
     * <li>{permission.name} — from each role's permissions (e.g. book:write)</li>
     * </ul>
     */
    public static UserDetailsImpl build(User user) {
        Set<GrantedAuthority> authorities = new java.util.LinkedHashSet<>();

        // 1. Legacy enum role (ROLE_ADMIN or ROLE_USER) — backward compatible
        if (user.getRole() != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        }

        // 2. Dynamic roles from user_roles table
        for (com.example.library.entity.Role role : user.getRoles()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));
            // 3. Fine-grained permissions from role_permissions table
            for (com.example.library.entity.Permission perm : role.getPermissions()) {
                authorities.add(new SimpleGrantedAuthority(perm.getName()));
            }
        }

        return new UserDetailsImpl(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getFullName(),
                user.getTokenValidAfter(),
                authorities);
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
