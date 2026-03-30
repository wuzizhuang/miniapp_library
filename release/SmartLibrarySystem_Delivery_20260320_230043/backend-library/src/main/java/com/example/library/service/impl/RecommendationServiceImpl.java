package com.example.library.service.impl;

import com.example.library.dto.recommendation.RecommendationCreateDto;
import com.example.library.dto.recommendation.RecommendationPostDto;
import com.example.library.entity.Book;
import com.example.library.entity.Notification;
import com.example.library.entity.RecommendationFollow;
import com.example.library.entity.RecommendationLike;
import com.example.library.entity.RecommendationPost;
import com.example.library.entity.User;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookRepository;
import com.example.library.repository.RecommendationFollowRepository;
import com.example.library.repository.RecommendationLikeRepository;
import com.example.library.repository.RecommendationPostRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.NotificationService;
import com.example.library.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 推荐服务实现类。
 * 负责推荐动态流、发帖、点赞、关注教师以及通知推送。
 */
@Service
@RequiredArgsConstructor
public class RecommendationServiceImpl implements RecommendationService {

    private static final String FEED_SCOPE_ALL = "all";
    private static final String FEED_SCOPE_FOLLOWING = "following";
    private static final String FEED_SCOPE_MINE = "mine";

    private final RecommendationPostRepository recommendationPostRepository;
    private final RecommendationLikeRepository recommendationLikeRepository;
    private final RecommendationFollowRepository recommendationFollowRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final NotificationService notificationService;

    /**
     * 获取推荐动态流。
     * 支持全部、关注中和仅自己三种视角。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<RecommendationPostDto> getFeed(Integer currentUserId, String scope, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createTime"));
        String normalizedScope = normalizeScope(scope);

        Page<RecommendationPost> posts = switch (normalizedScope) {
            case FEED_SCOPE_FOLLOWING -> recommendationPostRepository.findFollowingFeed(currentUserId, pageable);
            case FEED_SCOPE_MINE -> recommendationPostRepository.findByAuthorUserIdOrderByCreateTimeDesc(currentUserId, pageable);
            default -> recommendationPostRepository.findAll(pageable);
        };

        List<RecommendationPostDto> content = buildDtos(posts.getContent(), currentUserId);
        return new PageImpl<>(content, pageable, posts.getTotalElements());
    }

    /**
     * 发布一条新的推荐动态。
     * 当前仅教师账号或管理员可发布推荐内容。
     */
    @Override
    @Transactional
    public RecommendationPostDto createRecommendation(Integer currentUserId, RecommendationCreateDto dto) {
        User author = requireUser(currentUserId);
        ensureCanPublish(author);

        Book book = bookRepository.findById(dto.getBookId())
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + dto.getBookId()));

        RecommendationPost post = new RecommendationPost();
        post.setAuthor(author);
        post.setBook(book);
        post.setContent(dto.getContent().trim());

        RecommendationPost saved = recommendationPostRepository.save(post);
        notifyFollowers(saved);

        return enrichSingle(saved, currentUserId);
    }

    /**
     * 删除推荐动态。
     * 仅动态作者本人或管理员可删除。
     */
    @Override
    @Transactional
    public void deleteRecommendation(Integer currentUserId, Long postId) {
        RecommendationPost post = recommendationPostRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found with id: " + postId));
        User actor = requireUser(currentUserId);

        if (!post.getAuthor().getUserId().equals(currentUserId) && actor.getRole() != User.UserRole.ADMIN) {
            throw new BadRequestException("Only the author or admin can delete this recommendation");
        }

        recommendationLikeRepository.deleteByPostPostId(postId);
        recommendationPostRepository.delete(post);
    }

    /**
     * 点赞推荐动态。
     */
    @Override
    @Transactional
    public void likeRecommendation(Integer currentUserId, Long postId) {
        RecommendationPost post = recommendationPostRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found with id: " + postId));

        if (recommendationLikeRepository.findByPostPostIdAndUserUserId(postId, currentUserId).isPresent()) {
            return;
        }

        RecommendationLike like = new RecommendationLike();
        like.setPost(post);
        like.setUser(requireUser(currentUserId));
        recommendationLikeRepository.save(like);
    }

    /**
     * 取消点赞推荐动态。
     */
    @Override
    @Transactional
    public void unlikeRecommendation(Integer currentUserId, Long postId) {
        RecommendationLike like = recommendationLikeRepository.findByPostPostIdAndUserUserId(postId, currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation like not found"));
        recommendationLikeRepository.delete(like);
    }

    /**
     * 关注教师推荐人。
     */
    @Override
    @Transactional
    public void followTeacher(Integer currentUserId, Integer teacherUserId) {
        if (currentUserId.equals(teacherUserId)) {
            throw new BadRequestException("You cannot follow yourself");
        }

        User follower = requireUser(currentUserId);
        User teacher = requireUser(teacherUserId);

        ensureTeacherAccount(teacher);

        if (recommendationFollowRepository.existsByFollowerUserIdAndTeacherUserId(currentUserId, teacherUserId)) {
            return;
        }

        RecommendationFollow follow = new RecommendationFollow();
        follow.setFollower(follower);
        follow.setTeacher(teacher);
        recommendationFollowRepository.save(follow);
    }

    /**
     * 取消关注教师推荐人。
     */
    @Override
    @Transactional
    public void unfollowTeacher(Integer currentUserId, Integer teacherUserId) {
        RecommendationFollow follow = recommendationFollowRepository
                .findByFollowerUserIdAndTeacherUserId(currentUserId, teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Follow relationship not found"));
        recommendationFollowRepository.delete(follow);
    }

    /**
     * 在教师发布推荐后，通知其关注者。
     */
    private void notifyFollowers(RecommendationPost post) {
        List<Integer> followerIds = recommendationFollowRepository.findFollowerIdsByTeacherUserId(post.getAuthor().getUserId());

        for (Integer followerId : followerIds) {
            notificationService.sendNotification(
                    followerId,
                    Notification.NotificationType.NEW_BOOK_RECOMMEND,
                    post.getAuthor().getFullName() + " 推荐了新书",
                    "《" + post.getBook().getTitle() + "》: " + summarize(post.getContent()),
                    "RECOMMENDATION",
                    String.valueOf(post.getPostId()),
                    "/my/recommendations",
                    buildBusinessKey("TEACHER_RECOMMENDATION", post.getPostId()));
        }
    }

    /**
     * 生成推荐内容摘要，用于通知展示。
     */
    private String summarize(String content) {
        String normalized = content == null ? "" : content.trim();
        if (normalized.length() <= 60) {
            return normalized;
        }
        return normalized.substring(0, 60) + "...";
    }

    /**
     * 将单条动态封装为带用户上下文的 DTO。
     */
    private RecommendationPostDto enrichSingle(RecommendationPost post, Integer currentUserId) {
        return buildDtos(List.of(post), currentUserId).get(0);
    }

    /**
     * 批量构建推荐动态 DTO，并补齐点赞数、是否已点赞、是否已关注等派生信息。
     */
    private List<RecommendationPostDto> buildDtos(List<RecommendationPost> posts, Integer currentUserId) {
        List<Long> postIds = posts.stream().map(RecommendationPost::getPostId).toList();
        List<Integer> authorIds = posts.stream().map(post -> post.getAuthor().getUserId()).distinct().toList();

        Map<Long, Long> likeCounts = getLikeCounts(postIds);
        Set<Long> likedPostIds = getLikedPostIds(currentUserId, postIds);
        Set<Integer> followingTeacherIds = getFollowingTeacherIds(currentUserId, authorIds);
        User currentUser = currentUserId == null ? null : userRepository.findById(currentUserId).orElse(null);

        return posts.stream()
                .map(post -> toDto(post, likeCounts, likedPostIds, followingTeacherIds, currentUser))
                .toList();
    }

    /**
     * 将推荐动态实体转换为 DTO。
     */
    private RecommendationPostDto toDto(
            RecommendationPost post,
            Map<Long, Long> likeCounts,
            Set<Long> likedPostIds,
            Set<Integer> followingTeacherIds,
            User currentUser) {
        RecommendationPostDto dto = new RecommendationPostDto();
        dto.setPostId(post.getPostId());
        dto.setAuthorUserId(post.getAuthor().getUserId());
        dto.setAuthorUsername(post.getAuthor().getUsername());
        dto.setAuthorFullName(post.getAuthor().getFullName());
        dto.setAuthorIdentityType(post.getAuthor().getIdentityType() == null ? null : post.getAuthor().getIdentityType().name());
        dto.setAuthorDepartment(post.getAuthor().getDepartment());
        dto.setBookId(post.getBook().getBookId());
        dto.setBookTitle(post.getBook().getTitle());
        dto.setBookIsbn(post.getBook().getIsbn());
        dto.setBookCoverUrl(post.getBook().getCoverUrl());
        dto.setContent(post.getContent());
        dto.setCreateTime(post.getCreateTime());
        dto.setLikeCount(likeCounts.getOrDefault(post.getPostId(), 0L));
        dto.setLikedByMe(likedPostIds.contains(post.getPostId()));
        dto.setFollowingAuthor(followingTeacherIds.contains(post.getAuthor().getUserId()));
        dto.setCanManage(currentUser != null
                && (currentUser.getRole() == User.UserRole.ADMIN
                        || post.getAuthor().getUserId().equals(currentUser.getUserId())));
        return dto;
    }

    /**
     * 统计动态点赞数。
     */
    private Map<Long, Long> getLikeCounts(Collection<Long> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }

        return recommendationLikeRepository.countGroupedByPostIds(postIds).stream()
                .collect(Collectors.toMap(
                        RecommendationLikeRepository.RecommendationLikeCountView::getPostId,
                        RecommendationLikeRepository.RecommendationLikeCountView::getLikeCount));
    }

    /**
     * 查询当前用户已点赞的动态集合。
     */
    private Set<Long> getLikedPostIds(Integer currentUserId, Collection<Long> postIds) {
        if (currentUserId == null || postIds.isEmpty()) {
            return Set.of();
        }

        return recommendationLikeRepository.findLikedPostIds(currentUserId, postIds).stream().collect(Collectors.toSet());
    }

    /**
     * 查询当前用户在作者列表中已经关注的教师 ID。
     */
    private Set<Integer> getFollowingTeacherIds(Integer currentUserId, Collection<Integer> teacherIds) {
        if (currentUserId == null || teacherIds.isEmpty()) {
            return Set.of();
        }

        return recommendationFollowRepository.findTeacherIdsByFollowerUserIdAndTeacherIds(currentUserId, teacherIds).stream()
                .collect(Collectors.toSet());
    }

    /**
     * 按用户 ID 查询用户，查不到时抛出异常。
     */
    private User requireUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    /**
     * 校验当前用户是否具备发布推荐权限。
     */
    private void ensureCanPublish(User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return;
        }
        if (user.getIdentityType() != User.IdentityType.TEACHER) {
            throw new BadRequestException("Only teacher accounts can publish recommendations");
        }
    }

    /**
     * 校验被关注对象是否属于教师推荐人。
     */
    private void ensureTeacherAccount(User user) {
        if (user.getRole() == User.UserRole.ADMIN) {
            return;
        }
        if (user.getIdentityType() != User.IdentityType.TEACHER) {
            throw new BadRequestException("Only teacher accounts can be followed as recommenders");
        }
    }

    /**
     * 规范化动态流范围参数。
     */
    private String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return FEED_SCOPE_ALL;
        }

        return switch (scope.trim().toLowerCase()) {
            case FEED_SCOPE_FOLLOWING -> FEED_SCOPE_FOLLOWING;
            case FEED_SCOPE_MINE -> FEED_SCOPE_MINE;
            default -> FEED_SCOPE_ALL;
        };
    }

    /**
     * 构造通知去重业务主键。
     */
    private String buildBusinessKey(String prefix, Long entityId) {
        return entityId == null ? null : prefix + ":" + entityId;
    }
}
