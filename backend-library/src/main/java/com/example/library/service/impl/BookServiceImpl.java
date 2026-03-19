package com.example.library.service.impl;

import com.example.library.dto.AuthorDto;
import com.example.library.dto.book.BookCreateDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.book.BookUpdateDto;
import com.example.library.entity.*;
import com.example.library.exception.BadRequestException;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.BookService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.IntStream;

/**
 * Default implementation of the book catalog service.
 */
@Service
@RequiredArgsConstructor
public class BookServiceImpl implements BookService {

    private static final String MSG_BOOK_NOT_FOUND = "Book not found with id: ";
    private static final String MSG_ISBN_EXISTS = "Book with ISBN %s already exists";
    private static final String MSG_PUBLISHER_NOT_FOUND = "Publisher not found with id: ";
    private static final String MSG_CATEGORY_NOT_FOUND = "Category not found with id: ";
    private static final String MSG_AUTHOR_NOT_FOUND = "Author not found with id: ";

    private final BookRepository bookRepository;
    private final PublisherRepository publisherRepository;
    private final CategoryRepository categoryRepository;
    private final AuthorRepository authorRepository;
    private final BookAuthorRepository bookAuthorRepository;
    private final BookCopyRepository bookCopyRepository;
    private final LoanRepository loanRepository;
    private final SearchHistoryRepository searchHistoryRepository;
    private final ReservationRepository reservationRepository;

    /**
     * Returns paged book details.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<BookDetailDto> getAllBooks(int page, int size, String sortBy, String direction) {
        Sort.Direction sortDirection = direction.equalsIgnoreCase("DESC") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        return bookRepository.findAll(pageable).map(this::convertToDetailDto);
    }

    /**
     * Returns book details by id.
     */
    @Override
    @Transactional(readOnly = true)
    public BookDetailDto getBookById(Integer id) {
        return bookRepository.findById(id)
                .map(this::convertToDetailDto)
                .orElseThrow(() -> new ResourceNotFoundException(MSG_BOOK_NOT_FOUND + id));
    }

    /**
     * Returns book details by ISBN.
     */
    @Override
    @Transactional(readOnly = true)
    public BookDetailDto getBookByIsbn(String isbn) {
        return bookRepository.findByIsbn(isbn)
                .map(this::convertToDetailDto)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with ISBN: " + isbn));
    }

    /**
     * Searches books by keyword.
     */
    @Override
    @Transactional
    public Page<BookDetailDto> searchBooks(
            String keyword,
            String title,
            String author,
            String publisher,
            Integer categoryId,
            Boolean availableOnly,
            String sort,
            int page,
            int size,
            Integer userId) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        String normalizedKeyword = normalizeSearchText(keyword);
        String normalizedTitle = normalizeSearchText(title);
        String normalizedAuthor = normalizeSearchText(author);
        String normalizedPublisher = normalizeSearchText(publisher);
        boolean filterAvailableOnly = Boolean.TRUE.equals(availableOnly);

        List<Book> candidates = bookRepository.searchCatalog(
                normalizedKeyword,
                normalizedTitle,
                normalizedAuthor,
                normalizedPublisher,
                categoryId,
                Pageable.unpaged());

        LocalDateTime popularitySince = LocalDateTime.now().minusDays(30);
        List<RankedBook> rankedBooks = candidates.stream()
                .map(book -> rankBook(book,
                        normalizedKeyword,
                        normalizedTitle,
                        normalizedAuthor,
                        normalizedPublisher,
                        popularitySince))
                .filter(item -> !filterAvailableOnly || item.dto().getAvailableCopies() > 0)
                .sorted(buildSearchComparator(sort))
                .toList();

        int fromIndex = Math.min((int) pageable.getOffset(), rankedBooks.size());
        int toIndex = Math.min(fromIndex + pageable.getPageSize(), rankedBooks.size());
        List<BookDetailDto> content = rankedBooks.subList(fromIndex, toIndex).stream()
                .map(RankedBook::dto)
                .toList();

        if (normalizedKeyword != null) {
            try {
                saveSearchHistoryLog(normalizedKeyword, rankedBooks.size(), userId);
            } catch (Exception e) {
                // ignore search history errors — don't block main search response
            }
        }
        return new PageImpl<>(content, pageable, rankedBooks.size());
    }

    /**
     * Returns books by category.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<BookDetailDto> getBooksByCategory(Integer categoryId, int page, int size) {
        return bookRepository.findByCategoryId(categoryId, PageRequest.of(page, size)).map(this::convertToDetailDto);
    }

    /**
     * Returns books by author.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<BookDetailDto> getBooksByAuthor(Integer authorId, int page, int size) {
        return bookRepository.findByAuthorId(authorId, PageRequest.of(page, size)).map(this::convertToDetailDto);
    }

    /**
     * Returns books by publisher.
     */
    @Override
    @Transactional(readOnly = true)
    public Page<BookDetailDto> getBooksByPublisher(Integer publisherId, int page, int size) {
        return bookRepository.findByPublisherId(publisherId, PageRequest.of(page, size)).map(this::convertToDetailDto);
    }

    /**
     * Creates a book with authors and copies.
     */
    @Override
    @Transactional
    public BookDetailDto createBook(BookCreateDto dto) {
        bookRepository.findByIsbn(dto.getIsbn()).ifPresent(b -> {
            throw new IllegalArgumentException(String.format(MSG_ISBN_EXISTS, dto.getIsbn()));
        });

        validateCreateRequest(dto);

        Book book = new Book();
        updateBasicInfo(book, dto.getIsbn(), dto.getTitle(), dto.getCoverUrl(),
                dto.getResourceMode(), dto.getOnlineAccessUrl(), dto.getOnlineAccessType(),
                dto.getDescription(), dto.getPageCount(), dto.getPublishedYear(), dto.getLanguage());

        setBookRelations(book, dto.getPublisherId(), dto.getCategoryId());

        Book savedBook = bookRepository.save(book);

        if (dto.getAuthorIds() != null && !dto.getAuthorIds().isEmpty()) {
            saveBookAuthors(savedBook, dto.getAuthorIds());
        }

        createBookCopies(savedBook, dto.getCopyCount());

        return convertToDetailDto(savedBook);
    }

    /**
     * Updates a book and its author relations.
     */
    @Override
    @Transactional
    public BookDetailDto updateBook(Integer id, BookUpdateDto dto) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(MSG_BOOK_NOT_FOUND + id));

        if (dto.getIsbn() != null && !book.getIsbn().equals(dto.getIsbn())) {
            validateIsbnUniqueness(id, dto.getIsbn());
            book.setIsbn(dto.getIsbn());
        }

        validateUpdateRequest(book, dto);
        updateFieldsIfNotNull(book, dto);

        if (dto.getAuthorIds() != null) {
            bookAuthorRepository.deleteByBookBookId(id);
            saveBookAuthors(book, dto.getAuthorIds());
        }

        return convertToDetailDto(bookRepository.save(book));
    }

    /**
     * Soft-deletes a book and marks copies as damaged.
     */
    @Override
    @Transactional
    public void deleteBook(Integer id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(MSG_BOOK_NOT_FOUND + id));

        if (loanRepository.countActiveLoansForBook(id) > 0) {
            throw new IllegalStateException("Cannot delete book with active loans. Please return copies first.");
        }

        book.setStatus(Book.BookStatus.INACTIVE);
        bookRepository.save(book);
        bookCopyRepository.updateStatusByBookId(BookCopy.CopyStatus.DAMAGED, id);
    }

    private void updateBasicInfo(Book book, String isbn, String title, String cover,
            Book.ResourceMode resourceMode, String onlineAccessUrl, Book.OnlineAccessType onlineAccessType,
            String desc, Integer pages, Integer year, String lang) {
        Book.ResourceMode resolvedResourceMode = resolveResourceMode(resourceMode);
        book.setIsbn(isbn);
        book.setTitle(title);
        book.setCoverUrl(cover);
        book.setResourceMode(resolvedResourceMode);
        if (!requiresOnlineResource(resolvedResourceMode)) {
            book.setOnlineAccessUrl(null);
            book.setOnlineAccessType(null);
        } else {
            book.setOnlineAccessUrl(normalizeOnlineAccessUrl(onlineAccessUrl));
            book.setOnlineAccessType(onlineAccessType);
        }
        book.setDescription(desc);
        book.setPageCount(pages);
        book.setPublishedYear(year);
        book.setLanguage(lang);
    }

    private void updateFieldsIfNotNull(Book book, BookUpdateDto dto) {
        if (dto.getTitle() != null)
            book.setTitle(dto.getTitle());
        if (dto.getCoverUrl() != null)
            book.setCoverUrl(dto.getCoverUrl());
        if (dto.getResourceMode() != null) {
            book.setResourceMode(dto.getResourceMode());
            if (!requiresOnlineResource(dto.getResourceMode())) {
                book.setOnlineAccessUrl(null);
                book.setOnlineAccessType(null);
            }
        }
        if (dto.getOnlineAccessUrl() != null && requiresOnlineResource(resolveResourceMode(book.getResourceMode())))
            book.setOnlineAccessUrl(normalizeOnlineAccessUrl(dto.getOnlineAccessUrl()));
        if (dto.getOnlineAccessType() != null && requiresOnlineResource(resolveResourceMode(book.getResourceMode())))
            book.setOnlineAccessType(dto.getOnlineAccessType());
        if (dto.getDescription() != null)
            book.setDescription(dto.getDescription());
        if (dto.getPageCount() != null)
            book.setPageCount(dto.getPageCount());
        if (dto.getPublishedYear() != null)
            book.setPublishedYear(dto.getPublishedYear());
        if (dto.getLanguage() != null)
            book.setLanguage(dto.getLanguage());
        setBookRelations(book, dto.getPublisherId(), dto.getCategoryId());
    }

    private void setBookRelations(Book book, Integer publisherId, Integer categoryId) {
        if (publisherId != null) {
            book.setPublisher(publisherRepository.findByPublisherIdAndIsDeletedFalse(publisherId)
                    .orElseThrow(() -> new ResourceNotFoundException(MSG_PUBLISHER_NOT_FOUND + publisherId)));
        }
        if (categoryId != null) {
            book.setCategory(categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException(MSG_CATEGORY_NOT_FOUND + categoryId)));
        }
    }

    private String normalizeOnlineAccessUrl(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void validateCreateRequest(BookCreateDto dto) {
        Book.ResourceMode resourceMode = resolveResourceMode(dto.getResourceMode());

        validateResourceFields(resourceMode, dto.getOnlineAccessUrl(), dto.getOnlineAccessType());
        validateCopyCount(resourceMode, dto.getCopyCount());
    }

    private void validateUpdateRequest(Book book, BookUpdateDto dto) {
        boolean touchesResourceFields = dto.getResourceMode() != null
                || dto.getOnlineAccessUrl() != null
                || dto.getOnlineAccessType() != null;

        if (!touchesResourceFields) {
            return;
        }

        Book.ResourceMode nextResourceMode = resolveResourceMode(
                dto.getResourceMode() != null ? dto.getResourceMode() : book.getResourceMode());

        if (!requiresOnlineResource(nextResourceMode)) {
            if (dto.getOnlineAccessUrl() != null || dto.getOnlineAccessType() != null) {
                throw new BadRequestException("Physical-only books cannot include online resource metadata");
            }

            return;
        }

        String nextOnlineAccessUrl = dto.getOnlineAccessUrl() != null
                ? dto.getOnlineAccessUrl()
                : book.getOnlineAccessUrl();
        Book.OnlineAccessType nextOnlineAccessType = dto.getOnlineAccessType() != null
                ? dto.getOnlineAccessType()
                : book.getOnlineAccessType();

        validateResourceFields(nextResourceMode, nextOnlineAccessUrl, nextOnlineAccessType);
    }

    private void validateResourceFields(
            Book.ResourceMode resourceMode,
            String onlineAccessUrl,
            Book.OnlineAccessType onlineAccessType) {
        String normalizedOnlineAccessUrl = normalizeOnlineAccessUrl(onlineAccessUrl);

        if (!requiresOnlineResource(resourceMode)) {
            if (normalizedOnlineAccessUrl != null || onlineAccessType != null) {
                throw new BadRequestException("Physical-only books cannot include online resource metadata");
            }

            return;
        }

        if (normalizedOnlineAccessUrl == null) {
            throw new BadRequestException("Online access URL is required for digital or hybrid resources");
        }

        if (!isValidOnlineAccessUrl(normalizedOnlineAccessUrl)) {
            throw new BadRequestException("Online access URL must be a valid http/https URL");
        }

        if (onlineAccessType == null) {
            throw new BadRequestException("Online access type is required for digital or hybrid resources");
        }
    }

    private void validateCopyCount(Book.ResourceMode resourceMode, Integer copyCount) {
        if (copyCount == null) {
            return;
        }

        if (resourceMode == Book.ResourceMode.DIGITAL_ONLY && copyCount > 0) {
            throw new BadRequestException("Digital-only books cannot create physical copies");
        }

        if (supportsPhysicalCopies(resourceMode) && copyCount < 1) {
            throw new BadRequestException("Physical or hybrid books must create at least one copy");
        }
    }

    private Book.ResourceMode resolveResourceMode(Book.ResourceMode resourceMode) {
        return resourceMode != null ? resourceMode : Book.ResourceMode.PHYSICAL_ONLY;
    }

    private boolean requiresOnlineResource(Book.ResourceMode resourceMode) {
        return resourceMode == Book.ResourceMode.DIGITAL_ONLY || resourceMode == Book.ResourceMode.HYBRID;
    }

    private boolean supportsPhysicalCopies(Book.ResourceMode resourceMode) {
        return resourceMode != Book.ResourceMode.DIGITAL_ONLY;
    }

    private boolean isValidOnlineAccessUrl(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();

            return ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                    && uri.getHost() != null;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private void saveBookAuthors(Book book, List<Integer> authorIds) {
        for (int i = 0; i < authorIds.size(); i++) {
            Integer authorId = authorIds.get(i);
            Author author = authorRepository.findById(authorId)
                    .orElseThrow(() -> new ResourceNotFoundException(MSG_AUTHOR_NOT_FOUND + authorId));

            BookAuthor bookAuthor = new BookAuthor();
            bookAuthor.setId(new BookAuthor.BookAuthorId(book.getBookId(), author.getAuthorId()));
            bookAuthor.setBook(book);
            bookAuthor.setAuthor(author);
            bookAuthor.setAuthorOrder(i + 1);
            bookAuthorRepository.save(bookAuthor);
        }
    }

    private void createBookCopies(Book book, int count) {
        IntStream.range(0, count).forEach(i -> {
            BookCopy copy = new BookCopy();
            copy.setBook(book);
            copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
            copy.setAcquisitionDate(LocalDate.now());
            copy.setPrice(BigDecimal.valueOf(20.00));
            bookCopyRepository.save(copy);
        });
    }

    private void validateIsbnUniqueness(Integer bookId, String isbn) {
        bookRepository.findByIsbn(isbn).ifPresent(existing -> {
            if (!existing.getBookId().equals(bookId)) {
                throw new IllegalArgumentException(String.format(MSG_ISBN_EXISTS, isbn));
            }
        });
    }

    private BookDetailDto convertToDetailDto(Book book) {
        BookDetailDto dto = new BookDetailDto();
        dto.setBookId(book.getBookId());
        dto.setIsbn(book.getIsbn());
        dto.setTitle(book.getTitle());
        dto.setCoverUrl(book.getCoverUrl());
        dto.setResourceMode(book.getResourceMode() != null ? book.getResourceMode() : Book.ResourceMode.PHYSICAL_ONLY);
        dto.setOnlineAccessUrl(book.getOnlineAccessUrl());
        dto.setOnlineAccessType(book.getOnlineAccessType());
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
        dto.setTotalCopies(bookCopyRepository.countByBookBookId(book.getBookId()).intValue());
        dto.setPendingReservationCount(reservationRepository.countPendingReservationsForBook(book.getBookId()));
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookDetailDto> getNewArrivals(int limit) {
        // Last 30 days
        java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(30);
        return bookRepository.findNewArrivals(since, PageRequest.of(0, limit))
                .map(this::convertToDetailDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookDetailDto> getTrendingBooks(int limit) {
        // Last 30 days
        java.time.LocalDateTime since = java.time.LocalDateTime.now().minusDays(30);
        List<Integer> trendingIds = loanRepository.findTrendingBookIds(since, PageRequest.of(0, limit));
        if (trendingIds.isEmpty())
            return List.of();

        List<Book> books = bookRepository.findByIds(trendingIds);
        // Order by trendingIds sequence
        return trendingIds.stream()
                .flatMap(id -> books.stream().filter(b -> b.getBookId().equals(id)))
                .map(this::convertToDetailDto)
                .toList();
    }

    private void saveSearchHistoryLog(String keyword, int resultCount, Integer userId) {
        SearchHistory history = new SearchHistory();
        history.setKeyword(keyword);
        history.setResultCount(resultCount);
        history.setUserId(userId);
        searchHistoryRepository.save(history);
    }

    private RankedBook rankBook(
            Book book,
            String keyword,
            String title,
            String author,
            String publisher,
            LocalDateTime popularitySince) {
        BookDetailDto dto = convertToDetailDto(book);
        int pendingReservations = dto.getPendingReservationCount() == null ? 0 : dto.getPendingReservationCount();
        int availableCopies = dto.getAvailableCopies() == null ? 0 : dto.getAvailableCopies();
        long borrowCount30Days = loanRepository.countLoansForBookSince(book.getBookId(), popularitySince);

        double relevanceScore = calculateRelevanceScore(book, keyword, title, author, publisher);
        double availabilityScore = Math.min(availableCopies, 5) * 12.0 - Math.min(pendingReservations, 5) * 3.5;
        double popularityScore = Math.min(borrowCount30Days, 20L) * 2.0;
        double compositeScore = relevanceScore + availabilityScore + popularityScore;

        return new RankedBook(dto, book, compositeScore, relevanceScore, availabilityScore, popularityScore, borrowCount30Days, pendingReservations);
    }

    private Comparator<RankedBook> buildSearchComparator(String sort) {
        SearchSort searchSort = SearchSort.from(sort);
        Comparator<RankedBook> fallback = Comparator
                .comparingDouble(RankedBook::relevanceScore).reversed()
                .thenComparing(Comparator.comparingDouble(RankedBook::availabilityScore).reversed())
                .thenComparing(Comparator.comparingDouble(RankedBook::popularityScore).reversed())
                .thenComparing(item -> safeText(item.dto().getTitle()));

        return switch (searchSort) {
            case AVAILABILITY -> Comparator
                    .comparingInt((RankedBook item) -> safeInt(item.dto().getAvailableCopies())).reversed()
                    .thenComparingInt(RankedBook::pendingReservations)
                    .thenComparing(Comparator.comparingDouble(RankedBook::relevanceScore).reversed())
                    .thenComparing(item -> safeText(item.dto().getTitle()));
            case POPULARITY -> Comparator
                    .comparingLong(RankedBook::borrowCount30Days).reversed()
                    .thenComparing(Comparator.comparingInt((RankedBook item) -> safeInt(item.dto().getAvailableCopies())).reversed())
                    .thenComparing(Comparator.comparingDouble(RankedBook::relevanceScore).reversed())
                    .thenComparing(item -> safeText(item.dto().getTitle()));
            case NEWEST -> Comparator
                    .comparing((RankedBook item) -> item.book().getCreateTime(), Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(Comparator.comparingDouble(RankedBook::relevanceScore).reversed())
                    .thenComparing(item -> safeText(item.dto().getTitle()));
            case RELEVANCE -> Comparator
                    .comparingDouble(RankedBook::compositeScore).reversed()
                    .thenComparing(fallback);
        };
    }

    private double calculateRelevanceScore(
            Book book,
            String keyword,
            String title,
            String author,
            String publisher) {
        double score = 0;
        String bookTitle = safeText(book.getTitle());
        String isbn = safeText(book.getIsbn());
        String publisherName = book.getPublisher() == null ? "" : safeText(book.getPublisher().getName());
        String categoryName = book.getCategory() == null ? "" : safeText(book.getCategory().getName());
        List<String> authorNames = book.getBookAuthors().stream()
                .map(bookAuthor -> bookAuthor.getAuthor() == null ? "" : safeText(bookAuthor.getAuthor().getName()))
                .toList();

        score += scoreMatch(bookTitle, keyword, 50, 30, 18);
        score += scoreMatch(joinAuthors(authorNames), keyword, 28, 16, 10);
        score += scoreMatch(publisherName, keyword, 20, 12, 8);
        score += scoreMatch(categoryName, keyword, 18, 10, 6);
        score += scoreMatch(isbn, keyword, 32, 20, 12);

        score += scoreMatch(bookTitle, title, 45, 25, 16);
        score += scoreMatch(joinAuthors(authorNames), author, 40, 22, 14);
        score += scoreMatch(publisherName, publisher, 34, 18, 10);

        return score;
    }

    private double scoreMatch(String source, String query, double exactScore, double containsScore, double prefixScore) {
        if (query == null) {
            return 0;
        }

        String normalizedSource = safeText(source);
        if (normalizedSource.equals(query)) {
            return exactScore;
        }
        if (normalizedSource.startsWith(query)) {
            return prefixScore;
        }
        if (normalizedSource.contains(query)) {
            return containsScore;
        }
        return 0;
    }

    private String joinAuthors(List<String> authorNames) {
        return authorNames.stream()
                .filter(name -> name != null && !name.isBlank())
                .map(this::safeText)
                .reduce((left, right) -> left + " " + right)
                .orElse("");
    }

    private String normalizeSearchText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private enum SearchSort {
        RELEVANCE,
        AVAILABILITY,
        POPULARITY,
        NEWEST;

        private static SearchSort from(String value) {
            if (value == null || value.isBlank()) {
                return RELEVANCE;
            }

            try {
                return SearchSort.valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                return RELEVANCE;
            }
        }
    }

    private record RankedBook(
            BookDetailDto dto,
            Book book,
            double compositeScore,
            double relevanceScore,
            double availabilityScore,
            double popularityScore,
            long borrowCount30Days,
            int pendingReservations) {
    }
}
