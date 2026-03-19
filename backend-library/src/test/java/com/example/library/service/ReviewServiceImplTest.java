package com.example.library.service;

import com.example.library.dto.ReviewDto;
import com.example.library.dto.ReviewResponseDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.impl.ReviewServiceImpl;
import com.example.library.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ReviewServiceImpl 单元测试。
 *
 * <p>
 * 覆盖：创建评价（含重复评价检测）、按图书/用户查询、管理员审核（批准/拒绝）、更新、删除。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewService 单元测试")
class ReviewServiceImplTest {

    @Mock
    private BookReviewRepository reviewRepository;
    @Mock
    private BookRepository bookRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private LoanRepository loanRepository;

    @InjectMocks
    private ReviewServiceImpl reviewService;

    private User user;
    private Book book;
    private BookReview approvedReview;
    private BookReview pendingReview;

    @BeforeEach
    void setUp() {
        user = TestDataFactory.createUser(1, "alice");
        book = TestDataFactory.createBook(10, "Effective Java", "978-0-13-468599-1");
        approvedReview = TestDataFactory.createReview(1L, user, book, BookReview.ReviewStatus.APPROVED);
        pendingReview = TestDataFactory.createReview(2L, user, book, BookReview.ReviewStatus.PENDING);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // createReview
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("createReview — 创建评价")
    class CreateReview {

        private ReviewDto dto;

        @BeforeEach
        void setUp() {
            dto = new ReviewDto();
            dto.setBookId(10L);
            dto.setRating(5);
            dto.setCommentText("非常好看！");
        }

        @Test
        @DisplayName("成功：无关联借阅，创建评价")
        void success_noLoanId() {
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(reviewRepository.save(any(BookReview.class))).thenReturn(pendingReview);

            ReviewResponseDto result = reviewService.createReview(1, dto);

            assertThat(result).isNotNull();
            assertThat(result.getReviewId()).isEqualTo(2L);
            assertThat(result.getStatus()).isEqualTo("PENDING");
            verify(reviewRepository).save(any(BookReview.class));
        }

        @Test
        @DisplayName("幂等：同一借阅已有评价时直接返回已有记录")
        void duplicateReviewForLoan_returnsExistingReview() {
            dto.setLoanId(50L);
            BookCopy copy = TestDataFactory.createAvailableCopy(100, book);
            Loan loan = TestDataFactory.createActiveLoan(50, user, copy);
            loan.setStatus(Loan.LoanStatus.RETURNED);

            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.of(user));
            when(bookRepository.findById(10)).thenReturn(Optional.of(book));
            when(loanRepository.findById(50)).thenReturn(Optional.of(loan));
            when(reviewRepository.findByLoanId(50)).thenReturn(Optional.of(approvedReview));

            ReviewResponseDto result = reviewService.createReview(1, dto);

            assertThat(result.getReviewId()).isEqualTo(1L);
            verify(reviewRepository, never()).save(any(BookReview.class));
        }

        @Test
        @DisplayName("失败：用户不存在，抛出 ResourceNotFoundException")
        void fail_userNotFound() {
            when(userRepository.findByIdForUpdate(1)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> reviewService.createReview(1, dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // getReviewsByBookId
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("getReviewsByBookId — 按图书查询")
    class GetReviewsByBookId {

        @Test
        @DisplayName("成功：只返回 APPROVED 状态的评价")
        void success_onlyApprovedReviews() {
            Pageable pageable = PageRequest.of(0, 10);
            when(reviewRepository.findByBookBookIdAndStatus(10, BookReview.ReviewStatus.APPROVED, pageable))
                    .thenReturn(new PageImpl<>(List.of(approvedReview)));

            Page<ReviewResponseDto> result = reviewService.getReviewsByBookId(10, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getUsername()).isEqualTo("alice");
            assertThat(result.getContent().get(0).getBookTitle()).isEqualTo("Effective Java");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // auditReview
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("auditReview — 管理员审核")
    class AuditReview {

        @Test
        @DisplayName("批准：状态变为 APPROVED")
        void approve_statusBecomesApproved() {
            BookReview pendingReview = TestDataFactory.createReview(2L, user, book, BookReview.ReviewStatus.PENDING);
            when(reviewRepository.findById(2L)).thenReturn(Optional.of(pendingReview));
            when(reviewRepository.save(any(BookReview.class))).thenReturn(pendingReview);

            ReviewResponseDto result = reviewService.auditReview(2, true);

            assertThat(pendingReview.getStatus()).isEqualTo(BookReview.ReviewStatus.APPROVED);
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo("APPROVED");
        }

        @Test
        @DisplayName("拒绝：状态变为 REJECTED")
        void reject_statusBecomesRejected() {
            BookReview pendingReview = TestDataFactory.createReview(3L, user, book, BookReview.ReviewStatus.PENDING);
            when(reviewRepository.findById(3L)).thenReturn(Optional.of(pendingReview));
            when(reviewRepository.save(any(BookReview.class))).thenReturn(pendingReview);

            reviewService.auditReview(3, false);

            assertThat(pendingReview.getStatus()).isEqualTo(BookReview.ReviewStatus.REJECTED);
        }

        @Test
        @DisplayName("失败：评价不存在，抛出 ResourceNotFoundException")
        void notFound_throwsException() {
            when(reviewRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> reviewService.auditReview(999, true))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getAdminReviews — 后台列表")
    class GetAdminReviews {

        @Test
        @DisplayName("成功：状态和关键词组合查询")
        void success_withStatusAndKeyword() {
            Pageable pageable = PageRequest.of(0, 10);
            when(reviewRepository.searchForAdmin(BookReview.ReviewStatus.APPROVED, "java", pageable))
                    .thenReturn(new PageImpl<>(List.of(approvedReview)));

            Page<ReviewResponseDto> result = reviewService.getAdminReviews(
                    BookReview.ReviewStatus.APPROVED,
                    "java",
                    pageable);

            assertThat(result.getContent()).hasSize(1);
            verify(reviewRepository).searchForAdmin(BookReview.ReviewStatus.APPROVED, "java", pageable);
        }

        @Test
        @DisplayName("成功：空关键词归一化为 null")
        void success_blankKeywordNormalized() {
            Pageable pageable = PageRequest.of(0, 10);
            when(reviewRepository.searchForAdmin(null, null, pageable))
                    .thenReturn(Page.empty(pageable));

            reviewService.getAdminReviews(null, "   ", pageable);

            verify(reviewRepository).searchForAdmin(null, null, pageable);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // updateReview / deleteReview
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("updateReview / deleteReview")
    class UpdateAndDelete {

        @Test
        @DisplayName("updateReview — 成功：内容和评分更新")
        void updateReview_success() {
            ReviewDto updateDto = new ReviewDto();
            updateDto.setRating(3);
            updateDto.setCommentText("更新后的评论");

            when(reviewRepository.findById(1L)).thenReturn(Optional.of(approvedReview));
            when(reviewRepository.save(any(BookReview.class))).thenReturn(approvedReview);

            ReviewResponseDto result = reviewService.updateReview(1, updateDto);

            assertThat(approvedReview.getRating()).isEqualTo(3);
            assertThat(approvedReview.getCommentText()).isEqualTo("更新后的评论");
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("deleteReview — 成功：调用 deleteById")
        void deleteReview_success() {
            when(reviewRepository.existsById(1L)).thenReturn(true);

            reviewService.deleteReview(1);

            verify(reviewRepository).deleteById(1L);
        }

        @Test
        @DisplayName("deleteReview — 失败：不存在，抛出 ResourceNotFoundException")
        void deleteReview_notFound() {
            when(reviewRepository.existsById(999L)).thenReturn(false);

            assertThatThrownBy(() -> reviewService.deleteReview(999))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(reviewRepository, never()).deleteById(anyLong());
        }
    }
}
