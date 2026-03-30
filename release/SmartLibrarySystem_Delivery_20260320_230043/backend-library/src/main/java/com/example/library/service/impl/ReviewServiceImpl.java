package com.example.library.service.impl;

import com.example.library.dto.ReviewDto;
import com.example.library.dto.ReviewResponseDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 评论服务实现类。
 * 负责评论创建、审核、查询、更新和删除逻辑。
 */
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final BookReviewRepository reviewRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final LoanRepository loanRepository;

    /**
     * 创建图书评论。
     * 若评论绑定了借阅单，则会校验借阅归属与图书一致性，并避免同一借阅重复评论。
     */
    @Override
    @Transactional
    public ReviewResponseDto createReview(Integer userId, ReviewDto dto) {
        User user = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Book book = bookRepository.findById(dto.getBookId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Book not found"));

        if (dto.getLoanId() != null) {
            Loan loan = loanRepository.findById(dto.getLoanId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException("Loan not found"));

            if (!loan.getUser().getUserId().equals(userId)) {
                throw new BadRequestException("Loan does not belong to user");
            }
            if (!loan.getCopy().getBook().getBookId().equals(book.getBookId())) {
                throw new BadRequestException("Loan does not match the book");
            }
            BookReview existingReview = reviewRepository.findByLoanId(dto.getLoanId().intValue()).orElse(null);
            if (existingReview != null) {
                return convertToDto(existingReview);
            }
        }

        BookReview review = new BookReview();
        review.setUser(user);
        review.setBook(book);
        review.setRating(dto.getRating());
        review.setCommentText(dto.getCommentText());
        if (dto.getLoanId() != null) {
            review.setLoanId(dto.getLoanId().intValue());
        }
        review.setStatus(BookReview.ReviewStatus.PENDING);

        BookReview saved;
        try {
            saved = reviewRepository.save(review);
        } catch (DataIntegrityViolationException ex) {
            if (dto.getLoanId() != null) {
                BookReview existingReview = reviewRepository.findByLoanId(dto.getLoanId().intValue())
                        .orElseThrow(() -> ex);
                return convertToDto(existingReview);
            }
            throw ex;
        }
        return convertToDto(saved);
    }

    /**
     * 查询某本图书的已通过评论。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponseDto> getReviewsByBookId(Integer bookId, Pageable pageable) {
        return reviewRepository.findByBookBookIdAndStatus(bookId, BookReview.ReviewStatus.APPROVED, pageable)
                .map(this::convertToDto);
    }

    /**
     * 更新评论审核状态。
     */
    @Override
    @Transactional
    public void updateReviewStatus(Long reviewId, BookReview.ReviewStatus status) {
        BookReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setStatus(status);
        reviewRepository.save(review);
    }

    /**
     * 查询待审核评论列表。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponseDto> getPendingReviews(Pageable pageable) {
        return reviewRepository.findByStatus(BookReview.ReviewStatus.PENDING, pageable)
                .map(this::convertToDto);
    }

    /**
     * 查询后台评论列表，支持状态和关键字筛选。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponseDto> getAdminReviews(BookReview.ReviewStatus status, String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return reviewRepository.searchForAdmin(status, normalizedKeyword, pageable)
                .map(this::convertToDto);
    }

    /**
     * 审核评论，通过或驳回。
     */
    @Override
    @Transactional
    public ReviewResponseDto auditReview(Integer reviewId, boolean approved) {
        BookReview review = reviewRepository.findById(reviewId.longValue())
                .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        review.setStatus(approved ? BookReview.ReviewStatus.APPROVED : BookReview.ReviewStatus.REJECTED);
        BookReview saved = reviewRepository.save(review);
        return convertToDto(saved);
    }

    /**
     * 将评论实体转换为响应 DTO。
     */
    private ReviewResponseDto convertToDto(BookReview entity) {
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.setReviewId(entity.getReviewId());
        dto.setUserId(entity.getUser().getUserId());
        dto.setUsername(entity.getUser().getUsername());
        dto.setUserFullName(entity.getUser().getFullName());
        dto.setRating(entity.getRating());
        dto.setCommentText(entity.getCommentText());
        dto.setBookId(entity.getBook().getBookId());
        dto.setBookTitle(entity.getBook().getTitle());
        dto.setBookIsbn(entity.getBook().getIsbn());
        dto.setStatus(entity.getStatus().name());
        dto.setCreateTime(entity.getCreateTime());
        if (entity.getStatus() != BookReview.ReviewStatus.PENDING) {
            dto.setAuditTime(entity.getUpdateTime());
        }
        return dto;
    }

    /**
     * 查询某位用户提交的评论。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ReviewResponseDto> getReviewsByUser(Integer userId, Pageable pageable) {
        return reviewRepository.findByUserUserId(userId, pageable).map(this::convertToDto);
    }

    /**
     * 更新评论内容。
     */
    @Override
    @Transactional
    public ReviewResponseDto updateReview(Integer reviewId, ReviewDto dto) {
        BookReview review = reviewRepository.findById(reviewId.longValue())
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));
        review.setRating(dto.getRating());
        review.setCommentText(dto.getCommentText());
        return convertToDto(reviewRepository.save(review));
    }

    /**
     * 删除评论。
     */
    @Override
    @Transactional
    public void deleteReview(Integer reviewId) {
        if (!reviewRepository.existsById(reviewId.longValue())) {
            throw new ResourceNotFoundException("Review not found with id: " + reviewId);
        }
        reviewRepository.deleteById(reviewId.longValue());
    }
}
