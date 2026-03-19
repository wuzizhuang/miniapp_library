package com.example.library.service;

import com.example.library.dto.user.ProfileUpdateDto;
import com.example.library.dto.user.UserDto;
import com.example.library.dto.user.UserProfileDto;
import com.example.library.dto.user.UserUpdateDto;
import com.example.library.entity.User;
import com.example.library.repository.UserRepository;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService 单元测试")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = TestDataFactory.createUser(1, "alice");
        user.setPasswordHash("old-hash");
    }

    @Nested
    @DisplayName("updateUser - 修改密码")
    class UpdateUserPassword {

        @Test
        @DisplayName("成功：先校验旧密码，再保存新密码")
        void success_validOldPassword() {
            UserUpdateDto dto = new UserUpdateDto();
            dto.setPassword("NewPassword123");
            dto.setOldPassword("OldPassword123");

            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("OldPassword123", "old-hash")).thenReturn(true);
            when(passwordEncoder.encode("NewPassword123")).thenReturn("new-hash");
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserDto result = userService.updateUser(1, dto);

            assertThat(result.getUserId()).isEqualTo(1);
            assertThat(user.getPasswordHash()).isEqualTo("new-hash");
            verify(passwordEncoder).matches("OldPassword123", "old-hash");
            verify(passwordEncoder, times(1)).encode("NewPassword123");
            verify(userRepository).save(user);
            verify(refreshTokenService).revokeAllUserTokens(1);
        }

        @Test
        @DisplayName("失败：旧密码错误时不应覆盖原密码")
        void fail_invalidOldPassword() {
            UserUpdateDto dto = new UserUpdateDto();
            dto.setPassword("NewPassword123");
            dto.setOldPassword("WrongPassword123");

            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("WrongPassword123", "old-hash")).thenReturn(false);

            assertThatThrownBy(() -> userService.updateUser(1, dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Old password is incorrect");

            assertThat(user.getPasswordHash()).isEqualTo("old-hash");
            verify(passwordEncoder).matches("WrongPassword123", "old-hash");
            verify(passwordEncoder, never()).encode(any());
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("失败：密码长度应与 DTO 校验保持一致")
        void fail_passwordTooShort() {
            UserUpdateDto dto = new UserUpdateDto();
            dto.setPassword("short7");

            when(userRepository.findById(1)).thenReturn(Optional.of(user));

            assertThatThrownBy(() -> userService.updateUser(1, dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Password must be at least 8 characters long");

            verify(passwordEncoder, never()).matches(any(), any());
            verify(userRepository, never()).save(any(User.class));
        }
    }

    @Nested
    @DisplayName("updateProfile - 自助资料修改")
    class UpdateProfile {

        @Test
        @DisplayName("成功：允许修改基础资料，但保留管理员分配的身份类型")
        void keepIdentityTypeWhenUpdatingProfile() {
            ProfileUpdateDto dto = new ProfileUpdateDto();
            dto.setFullName("Alice Reader");
            dto.setEmail("alice.reader@test.com");
            dto.setDepartment("计算机学院");
            dto.setMajor("软件工程");
            dto.setEnrollmentYear(2024);

            user.setIdentityType(User.IdentityType.TEACHER);
            user.setEmail("alice@test.com");

            when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
            when(userRepository.existsByEmail("alice.reader@test.com")).thenReturn(false);
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserProfileDto result = userService.updateProfile("alice", dto);

            assertThat(result.getFullName()).isEqualTo("Alice Reader");
            assertThat(result.getEmail()).isEqualTo("alice.reader@test.com");
            assertThat(user.getDepartment()).isEqualTo("计算机学院");
            assertThat(user.getMajor()).isEqualTo("软件工程");
            assertThat(user.getEnrollmentYear()).isEqualTo(2024);
            assertThat(user.getIdentityType()).isEqualTo(User.IdentityType.TEACHER);

            verify(userRepository).save(user);
        }
    }

    @Nested
    @DisplayName("updateUserIdentityType - 管理员身份修改")
    class UpdateUserIdentityType {

        @Test
        @DisplayName("成功：允许管理员将读者提升为教师身份")
        void success_updateIdentityType() {
            when(userRepository.findById(1)).thenReturn(Optional.of(user));
            when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UserDto result = userService.updateUserIdentityType(1, User.IdentityType.TEACHER);

            assertThat(user.getIdentityType()).isEqualTo(User.IdentityType.TEACHER);
            assertThat(result.getIdentityType()).isEqualTo(User.IdentityType.TEACHER);
            verify(userRepository).save(user);
        }
    }
}
