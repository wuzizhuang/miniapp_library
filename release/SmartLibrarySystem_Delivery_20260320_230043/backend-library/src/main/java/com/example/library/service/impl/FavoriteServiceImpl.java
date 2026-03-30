package com.example.library.service.impl;

import com.example.library.dto.AuthorDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.entity.Book;
import com.example.library.entity.User;
import com.example.library.entity.UserFavorite;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.BookRepository;
import com.example.library.repository.UserFavoriteRepository;
import com.example.library.repository.UserRepository;
import com.example.library.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 收藏服务实现类。
 * 负责收藏增删查以及收藏图书详情转换。
 */
@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;

    /**
     * 添加图书到用户收藏夹。
     * 若已经收藏则直接返回，并通过唯一约束兜底并发重复提交。
     */
    @Override
    @Transactional
    public void addFavorite(Long userId, Integer bookId) {
        if (favoriteRepository.existsByUserUserIdAndBookBookId(userId.intValue(), bookId)) {
            return; // Already favorited
        }

        User user = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));

        UserFavorite favorite = new UserFavorite();
        favorite.setUser(user);
        favorite.setBook(book);
        try {
            favoriteRepository.save(favorite);
        } catch (DataIntegrityViolationException ignored) {
            // A concurrent request inserted the same favorite first.
        }
    }

    /**
     * 从用户收藏夹移除图书。
     */
    @Override
    @Transactional
    public void removeFavorite(Long userId, Integer bookId) {
        favoriteRepository.deleteByUserUserIdAndBookBookId(userId.intValue(), bookId);
    }

    /**
     * 分页查询用户收藏图书。
     */
    @Override
    @Transactional(readOnly = true)
    public Page<BookDetailDto> getUserFavorites(Long userId, int page, int size) {
        return favoriteRepository.findByUserUserId(userId.intValue(), PageRequest.of(page, size))
                .map(fav -> convertToDetailDto(fav.getBook()));
    }

    /**
     * 判断指定图书是否已被当前用户收藏。
     */
    @Override
    @Transactional(readOnly = true)
    public boolean isFavorite(Long userId, Integer bookId) {
        return favoriteRepository.existsByUserUserIdAndBookBookId(userId.intValue(), bookId);
    }

    /**
     * 将图书实体转换为收藏页使用的详情 DTO。
     */
    private BookDetailDto convertToDetailDto(Book book) {
        BookDetailDto dto = new BookDetailDto();
        dto.setBookId(book.getBookId());
        dto.setIsbn(book.getIsbn());
        dto.setTitle(book.getTitle());
        dto.setCoverUrl(book.getCoverUrl());
        dto.setDescription(book.getDescription());
        dto.setPageCount(book.getPageCount());
        dto.setPublishedYear(book.getPublishedYear());
        dto.setLanguage(book.getLanguage());

        if (book.getPublisher() != null) {
            dto.setPublisherId(book.getPublisher().getPublisherId());
            dto.setPublisherName(book.getPublisher().getName());
        }

        if (book.getCategory() != null) {
            dto.setCategoryId(book.getCategory().getCategoryId());
            dto.setCategoryName(book.getCategory().getName());
        }

        dto.setAuthors(book.getBookAuthors().stream()
                .sorted()
                .map(ba -> {
                    AuthorDto authorDto = new AuthorDto();
                    authorDto.setAuthorId(ba.getAuthor().getAuthorId());
                    authorDto.setName(ba.getAuthor().getName());
                    return authorDto;
                }).toList());

        dto.setAvailableCopies(bookCopyRepository.countAvailableCopiesByBookId(book.getBookId()).intValue());
        return dto;
    }
}
