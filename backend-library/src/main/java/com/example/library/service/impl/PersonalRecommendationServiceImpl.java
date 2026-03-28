package com.example.library.service.impl;

import com.example.library.dto.AuthorDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.recommendation.PersonalRecommendationDto;
import com.example.library.dto.recommendation.PersonalRecommendationDto.RecommendedBookDto;
import com.example.library.entity.Book;
import com.example.library.entity.User;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.UserFavoriteRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.BookService;
import com.example.library.service.PersonalRecommendationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 个人推荐服务实现类。
 * <p>
 * 推荐策略按优先级如下：
 * 1. 分类偏好推荐 —— 用户借阅/收藏过的图书所属分类中的其他活跃图书
 * 2. 作者偏好推荐 —— 用户借阅/收藏过的作者的其他作品
 * 3. 协同过滤推荐 —— 与当前用户借阅行为相似的用户还借了什么
 * 4. 兴趣标签推荐 —— 根据用户个人资料中的 interest_tags 进行模糊匹配
 * 5. 热门兜底推荐 —— 当上述策略推荐数量不足时，用近期热门书补充
 * <p>
 * 所有策略都会排除用户已经借阅或收藏过的图书，避免重复推荐。
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PersonalRecommendationServiceImpl implements PersonalRecommendationService {

    /** 协同过滤中，最多取多少名"相似用户"参与推荐。 */
    private static final int MAX_SIMILAR_USERS = 20;

    /** 用于反序列化用户兴趣标签 JSON 字段的全局 ObjectMapper。 */
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final BookRepository bookRepository;
    private final LoanRepository loanRepository;
    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final BookService bookService;

    /**
     * 获取指定用户的个人推荐结果。
     * 每个维度最多返回 limit 本图书。
     */
    @Override
    @Transactional(readOnly = true)
    public PersonalRecommendationDto getPersonalRecommendations(Integer userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // 收集用户已读/已收藏的图书 ID，用于排除
        Set<Integer> excludeBookIds = new LinkedHashSet<>();
        excludeBookIds.addAll(loanRepository.findBorrowedBookIds(userId));
        excludeBookIds.addAll(userFavoriteRepository.findFavoriteBookIds(userId));
        // 保证 excludeBookIds 不为空（避免 NOT IN 空集合的 SQL 问题）
        if (excludeBookIds.isEmpty()) {
            excludeBookIds.add(-1);
        }
        List<Integer> excludeList = new ArrayList<>(excludeBookIds);

        // 收集全局已推荐的图书 ID，在不同策略间去重
        Set<Integer> globalRecommendedIds = new LinkedHashSet<>(excludeBookIds);

        PersonalRecommendationDto result = new PersonalRecommendationDto();

        // 策略 1: 分类偏好推荐
        result.setByCategory(recommendByCategory(userId, excludeList, globalRecommendedIds, safeLimit));

        // 策略 2: 作者偏好推荐
        result.setByAuthor(recommendByAuthor(userId, excludeList, globalRecommendedIds, safeLimit));

        // 策略 3: 协同过滤推荐
        result.setByCollaborative(recommendByCollaborativeFiltering(userId, excludeList, globalRecommendedIds, safeLimit));

        // 策略 4: 兴趣标签推荐
        result.setByInterestTags(recommendByInterestTags(user, excludeList, globalRecommendedIds, safeLimit));

        // 策略 5: 热门兜底推荐
        result.setTrending(recommendTrending(globalRecommendedIds, safeLimit));

        return result;
    }

    // ──────────────── 策略实现 ────────────────

    /**
     * 策略 1: 基于分类偏好推荐。
     * 将用户借阅和收藏中出现的分类合并，找同分类的其他活跃图书。
     */
    private List<RecommendedBookDto> recommendByCategory(
            Integer userId,
            List<Integer> excludeBookIds,
            Set<Integer> globalRecommendedIds,
            int limit) {
        Set<Integer> categoryIds = new LinkedHashSet<>();
        categoryIds.addAll(loanRepository.findBorrowedCategoryIds(userId));
        categoryIds.addAll(userFavoriteRepository.findFavoriteCategoryIds(userId));

        if (categoryIds.isEmpty()) {
            return List.of();
        }

        List<Book> candidates = bookRepository.findByCategoryIdsExcluding(
                new ArrayList<>(categoryIds), excludeBookIds, PageRequest.of(0, limit * 2));

        return candidates.stream()
                .filter(book -> globalRecommendedIds.add(book.getBookId()))
                .limit(limit)
                .map(book -> toRecommendedBookDto(book, "根据您的阅读偏好分类推荐"))
                .toList();
    }

    /**
     * 策略 2: 基于作者偏好推荐。
     * 将用户借阅和收藏中出现的作者合并，找同作者的其他作品。
     */
    private List<RecommendedBookDto> recommendByAuthor(
            Integer userId,
            List<Integer> excludeBookIds,
            Set<Integer> globalRecommendedIds,
            int limit) {
        Set<Integer> authorIds = new LinkedHashSet<>();
        authorIds.addAll(loanRepository.findBorrowedAuthorIds(userId));
        authorIds.addAll(userFavoriteRepository.findFavoriteAuthorIds(userId));

        if (authorIds.isEmpty()) {
            return List.of();
        }

        List<Book> candidates = bookRepository.findByAuthorIdsExcluding(
                new ArrayList<>(authorIds), excludeBookIds, PageRequest.of(0, limit * 2));

        return candidates.stream()
                .filter(book -> globalRecommendedIds.add(book.getBookId()))
                .limit(limit)
                .map(book -> toRecommendedBookDto(book, "您喜欢的作者的其他作品"))
                .toList();
    }

    /**
     * 策略 3: 协同过滤推荐。
     * 先找到与当前用户借阅行为重叠度最高的若干"相似用户"，
     * 然后挖掘这些用户借过但当前用户没借过的书。
     */
    private List<RecommendedBookDto> recommendByCollaborativeFiltering(
            Integer userId,
            List<Integer> excludeBookIds,
            Set<Integer> globalRecommendedIds,
            int limit) {
        List<Integer> similarUserIds = loanRepository.findSimilarUserIds(
                userId, PageRequest.of(0, MAX_SIMILAR_USERS));

        if (similarUserIds.isEmpty()) {
            return List.of();
        }

        // 将 globalRecommendedIds 中已有的都加入排除
        List<Integer> fullExclude = new ArrayList<>(globalRecommendedIds);

        List<Integer> bookIds = loanRepository.findBookIdsBorrowedByUsers(
                similarUserIds, fullExclude, PageRequest.of(0, limit * 2));

        if (bookIds.isEmpty()) {
            return List.of();
        }

        List<Book> books = bookRepository.findAllById(bookIds);
        // 按原始排序返回
        return bookIds.stream()
                .flatMap(id -> books.stream().filter(b -> b.getBookId().equals(id)))
                .filter(book -> globalRecommendedIds.add(book.getBookId()))
                .limit(limit)
                .map(book -> toRecommendedBookDto(book, "和您有相似阅读品味的读者也在读"))
                .toList();
    }

    /**
     * 策略 4: 基于兴趣标签推荐。
     * 解析用户的 interest_tags JSON 字段，按每个标签模糊搜索图书。
     */
    private List<RecommendedBookDto> recommendByInterestTags(
            User user,
            List<Integer> excludeBookIds,
            Set<Integer> globalRecommendedIds,
            int limit) {
        List<String> tags = parseInterestTags(user.getInterestTags());
        if (tags.isEmpty()) {
            return List.of();
        }

        // 将 globalRecommendedIds 中已有的都加入排除
        List<Integer> fullExclude = new ArrayList<>(globalRecommendedIds);

        List<RecommendedBookDto> results = new ArrayList<>();
        for (String tag : tags) {
            if (results.size() >= limit) break;

            List<Book> candidates = bookRepository.findByKeywordExcluding(
                    tag.trim(), fullExclude, PageRequest.of(0, limit));

            for (Book book : candidates) {
                if (results.size() >= limit) break;
                if (globalRecommendedIds.add(book.getBookId())) {
                    fullExclude.add(book.getBookId());
                    results.add(toRecommendedBookDto(book, "匹配您的兴趣标签「" + tag.trim() + "」"));
                }
            }
        }

        return results;
    }

    /**
     * 策略 5: 热门图书兜底推荐。
     * 使用近期借阅热度排行，排除已推荐过的图书。
     */
    private List<RecommendedBookDto> recommendTrending(
            Set<Integer> globalRecommendedIds,
            int limit) {
        List<BookDetailDto> trending = bookService.getTrendingBooks(limit * 3);

        return trending.stream()
                .filter(dto -> globalRecommendedIds.add(dto.getBookId()))
                .limit(limit)
                .map(dto -> toRecommendedBookDtoFromDetail(dto, "近期热门图书"))
                .toList();
    }

    // ──────────────── 工具方法 ────────────────

    /**
     * 将 Book 实体转换为推荐图书 DTO。
     */
    private RecommendedBookDto toRecommendedBookDto(Book book, String reason) {
        RecommendedBookDto dto = new RecommendedBookDto();
        dto.setBookId(book.getBookId());
        dto.setIsbn(book.getIsbn());
        dto.setTitle(book.getTitle());
        dto.setCoverUrl(book.getCoverUrl());
        dto.setDescription(summarize(book.getDescription()));
        dto.setPublishedYear(book.getPublishedYear());
        dto.setLanguage(book.getLanguage());
        dto.setPublisherName(book.getPublisher() != null ? book.getPublisher().getName() : null);
        dto.setCategoryName(book.getCategory() != null ? book.getCategory().getName() : null);
        dto.setAuthorNames(book.getBookAuthors().stream()
                .sorted()
                .map(ba -> ba.getAuthor() != null ? ba.getAuthor().getName() : null)
                .filter(Objects::nonNull)
                .toList());
        dto.setReason(reason);
        return dto;
    }

    /**
     * 从已有 BookDetailDto 转换为推荐图书 DTO。
     */
    private RecommendedBookDto toRecommendedBookDtoFromDetail(BookDetailDto detail, String reason) {
        RecommendedBookDto dto = new RecommendedBookDto();
        dto.setBookId(detail.getBookId());
        dto.setIsbn(detail.getIsbn());
        dto.setTitle(detail.getTitle());
        dto.setCoverUrl(detail.getCoverUrl());
        dto.setDescription(summarize(detail.getDescription()));
        dto.setPublishedYear(detail.getPublishedYear());
        dto.setLanguage(detail.getLanguage());
        dto.setPublisherName(detail.getPublisherName());
        dto.setCategoryName(detail.getCategoryName());
        dto.setAuthorNames(detail.getAuthors() != null
                ? detail.getAuthors().stream().map(AuthorDto::getName).filter(Objects::nonNull).toList()
                : List.of());
        dto.setAvailableCopies(detail.getAvailableCopies());
        dto.setTotalCopies(detail.getTotalCopies());
        dto.setAvgRating(detail.getAvgRating());
        dto.setReviewCount(detail.getReviewCount());
        dto.setReason(reason);
        return dto;
    }

    /**
     * 解析 interest_tags JSON 字符串为标签列表。
     * 兼容 JSON 数组和逗号分隔两种格式。
     */
    private List<String> parseInterestTags(String interestTags) {
        if (interestTags == null || interestTags.isBlank()) {
            return List.of();
        }

        String trimmed = interestTags.trim();
        if (trimmed.startsWith("[")) {
            try {
                return OBJECT_MAPPER.readValue(trimmed, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse interest_tags as JSON array: {}", trimmed, e);
                return List.of();
            }
        }

        // 兼容逗号分隔格式
        return Arrays.stream(trimmed.split("[,，;；]"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /**
     * 截取描述摘要，限制最大长度。
     */
    private String summarize(String text) {
        if (text == null) return null;
        String trimmed = text.trim();
        if (trimmed.length() <= 100) return trimmed;
        return trimmed.substring(0, 100) + "...";
    }
}
