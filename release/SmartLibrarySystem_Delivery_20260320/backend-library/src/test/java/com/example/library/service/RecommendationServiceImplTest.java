package com.example.library.service;

import com.example.library.dto.recommendation.RecommendationCreateDto;
import com.example.library.dto.recommendation.RecommendationPostDto;
import com.example.library.entity.Book;
import com.example.library.entity.Notification;
import com.example.library.entity.RecommendationPost;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.repository.BookRepository;
import com.example.library.repository.RecommendationFollowRepository;
import com.example.library.repository.RecommendationLikeRepository;
import com.example.library.repository.RecommendationPostRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.impl.RecommendationServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecommendationService 单元测试")
class RecommendationServiceImplTest {

    @Mock
    private RecommendationPostRepository recommendationPostRepository;

    @Mock
    private RecommendationLikeRepository recommendationLikeRepository;

    @Mock
    private RecommendationFollowRepository recommendationFollowRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private BookRepository bookRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private RecommendationServiceImpl recommendationService;

    @Test
    @DisplayName("createRecommendation: 教师可以发布推荐，并通知关注者")
    void createRecommendationByTeacher() {
        User teacher = createUser(10, "teacher", User.IdentityType.TEACHER, User.UserRole.USER);
        teacher.setFullName("Alice Teacher");
        teacher.setDepartment("计算机学院");

        Book book = TestDataFactory.createBook(7, "深入理解 Spring", "9780000000001");
        book.setCoverUrl("/covers/spring.jpg");

        RecommendationCreateDto dto = new RecommendationCreateDto();
        dto.setBookId(7);
        dto.setContent("  这本书很适合做后端课程延伸阅读。  ");

        when(userRepository.findById(10)).thenReturn(Optional.of(teacher));
        when(bookRepository.findById(7)).thenReturn(Optional.of(book));
        when(recommendationFollowRepository.findFollowerIdsByTeacherUserId(10)).thenReturn(List.of(21, 22));
        when(recommendationFollowRepository.findTeacherIdsByFollowerUserIdAndTeacherIds(eq(10), anyCollection()))
                .thenReturn(List.of());
        when(recommendationLikeRepository.countGroupedByPostIds(anyCollection())).thenReturn(List.of());
        when(recommendationLikeRepository.findLikedPostIds(eq(10), anyCollection())).thenReturn(List.of());
        when(recommendationPostRepository.save(any(RecommendationPost.class))).thenAnswer(invocation -> {
            RecommendationPost post = invocation.getArgument(0);
            post.setPostId(99L);
            post.setCreateTime(LocalDateTime.now());
            return post;
        });

        RecommendationPostDto result = recommendationService.createRecommendation(10, dto);

        ArgumentCaptor<RecommendationPost> postCaptor = ArgumentCaptor.forClass(RecommendationPost.class);
        verify(recommendationPostRepository).save(postCaptor.capture());
        RecommendationPost savedPost = postCaptor.getValue();

        assertThat(savedPost.getAuthor()).isEqualTo(teacher);
        assertThat(savedPost.getBook()).isEqualTo(book);
        assertThat(savedPost.getContent()).isEqualTo("这本书很适合做后端课程延伸阅读。");

        assertThat(result.getPostId()).isEqualTo(99L);
        assertThat(result.getAuthorUserId()).isEqualTo(10);
        assertThat(result.getAuthorIdentityType()).isEqualTo("TEACHER");
        assertThat(result.getBookId()).isEqualTo(7);
        assertThat(result.getLikeCount()).isEqualTo(0L);
        assertThat(result.getLikedByMe()).isFalse();
        assertThat(result.getFollowingAuthor()).isFalse();
        assertThat(result.getCanManage()).isTrue();

        verify(notificationService).sendNotification(
                eq(21),
                eq(Notification.NotificationType.NEW_BOOK_RECOMMEND),
                eq("Alice Teacher 推荐了新书"),
                eq("《深入理解 Spring》: 这本书很适合做后端课程延伸阅读。"),
                eq("RECOMMENDATION"),
                eq("99"),
                eq("/my/recommendations"),
                eq("TEACHER_RECOMMENDATION"));
        verify(notificationService).sendNotification(
                eq(22),
                eq(Notification.NotificationType.NEW_BOOK_RECOMMEND),
                eq("Alice Teacher 推荐了新书"),
                eq("《深入理解 Spring》: 这本书很适合做后端课程延伸阅读。"),
                eq("RECOMMENDATION"),
                eq("99"),
                eq("/my/recommendations"),
                eq("TEACHER_RECOMMENDATION"));
    }

    @Test
    @DisplayName("createRecommendation: 学生账号不能发布推荐")
    void rejectCreateRecommendationByStudent() {
        User student = createUser(11, "student", User.IdentityType.STUDENT, User.UserRole.USER);
        when(userRepository.findById(11)).thenReturn(Optional.of(student));

        RecommendationCreateDto dto = new RecommendationCreateDto();
        dto.setBookId(7);
        dto.setContent("我也想推荐");

        assertThatThrownBy(() -> recommendationService.createRecommendation(11, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("teacher accounts");

        verify(bookRepository, never()).findById(any());
        verify(recommendationPostRepository, never()).save(any());
        verify(notificationService, never()).sendNotification(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("followTeacher: 只能关注教师或管理员推荐者")
    void rejectFollowNonTeacherRecommender() {
        User follower = createUser(12, "reader", User.IdentityType.STUDENT, User.UserRole.USER);
        User nonTeacher = createUser(13, "staff", User.IdentityType.STAFF, User.UserRole.USER);

        when(userRepository.findById(12)).thenReturn(Optional.of(follower));
        when(userRepository.findById(13)).thenReturn(Optional.of(nonTeacher));

        assertThatThrownBy(() -> recommendationService.followTeacher(12, 13))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("can be followed");

        verify(recommendationFollowRepository, never()).save(any());
    }

    private User createUser(Integer id, String username, User.IdentityType identityType, User.UserRole role) {
        User user = TestDataFactory.createUser(id, username);
        user.setIdentityType(identityType);
        user.setRole(role);
        return user;
    }
}
