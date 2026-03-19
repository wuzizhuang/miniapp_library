package com.example.library.service;

import com.example.library.dto.book.BookCreateDto;
import com.example.library.dto.book.BookDetailDto;
import com.example.library.dto.book.BookUpdateDto;
import com.example.library.entity.*;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.*;
import com.example.library.service.impl.BookServiceImpl;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * BookServiceImpl 单元测试。
 *
 * <p>
 * 按功能方法分组，使用 {@link Nested} 嵌套类展示测试结构。
 * 测试覆盖：成功路径、资源未找到、业务规则校验（ISBN 重复、有活跃借阅时禁止删除）。
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("BookService 单元测试")
class BookServiceImplTest {

    // ─── Mocks ─────────────────────────────────────────────────────────────────
    @Mock
    private BookRepository bookRepository;
    @Mock
    private PublisherRepository publisherRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private AuthorRepository authorRepository;
    @Mock
    private BookAuthorRepository bookAuthorRepository;
    @Mock
    private BookCopyRepository bookCopyRepository;
    @Mock
    private LoanRepository loanRepository;
    @Mock
    private SearchHistoryRepository searchHistoryRepository;
    @Mock
    private ReservationRepository reservationRepository;

    @InjectMocks
    private BookServiceImpl bookService;

    // ─── 测试数据 ──────────────────────────────────────────────────────────────
    private Book testBook;
    private Publisher testPublisher;
    private Category testCategory;

    @BeforeEach
    void setUp() {
        testBook = TestDataFactory.createBook(1, "深入理解 Java 虚拟机", "978-7-111-64975-2");
        testPublisher = TestDataFactory.createPublisher(10, "机械工业出版社");
        testCategory = TestDataFactory.createCategory(20, "计算机科学");
        testBook.setPublisher(testPublisher);
        testBook.setCategory(testCategory);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // getAllBooks
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("getAllBooks — 分页查询")
    class GetAllBooks {

        @Test
        @DisplayName("成功：返回正确的分页数据")
        void success_returnsPaginatedResult() {
            Page<Book> bookPage = new PageImpl<>(List.of(testBook));
            when(bookRepository.findAll(any(Pageable.class))).thenReturn(bookPage);
            // countAvailableCopies 被 convertToDetailDto 调用
            when(bookCopyRepository.countAvailableCopiesByBookId(anyInt())).thenReturn(3L);

            Page<BookDetailDto> result = bookService.getAllBooks(0, 10, "title", "ASC");

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getTitle()).isEqualTo("深入理解 Java 虚拟机");
            verify(bookRepository).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("成功：结果为空时返回空分页")
        void success_emptyResult() {
            when(bookRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());

            Page<BookDetailDto> result = bookService.getAllBooks(0, 10, "title", "ASC");

            assertThat(result.getContent()).isEmpty();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // getBookById
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("getBookById — 按 ID 查询")
    class GetBookById {

        @Test
        @DisplayName("成功：找到图书，返回 DTO")
        void success() {
            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));
            when(bookCopyRepository.countAvailableCopiesByBookId(1)).thenReturn(2L);

            BookDetailDto result = bookService.getBookById(1);

            assertThat(result).isNotNull();
            assertThat(result.getBookId()).isEqualTo(1);
            assertThat(result.getIsbn()).isEqualTo("978-7-111-64975-2");
            assertThat(result.getPublisherName()).isEqualTo("机械工业出版社");
            assertThat(result.getCategoryName()).isEqualTo("计算机科学");
            assertThat(result.getAvailableCopies()).isEqualTo(2);
        }

        @Test
        @DisplayName("失败：ID 不存在，抛出 ResourceNotFoundException")
        void notFound_throwsException() {
            when(bookRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.getBookById(999))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");

            verify(bookRepository).findById(999);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // getBookByIsbn
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("getBookByIsbn — 按 ISBN 查询")
    class GetBookByIsbn {

        @Test
        @DisplayName("成功：ISBN 匹配，返回 DTO")
        void success() {
            when(bookRepository.findByIsbn("978-7-111-64975-2")).thenReturn(Optional.of(testBook));
            when(bookCopyRepository.countAvailableCopiesByBookId(anyInt())).thenReturn(1L);

            BookDetailDto result = bookService.getBookByIsbn("978-7-111-64975-2");

            assertThat(result.getIsbn()).isEqualTo("978-7-111-64975-2");
        }

        @Test
        @DisplayName("失败：ISBN 不存在，抛出 ResourceNotFoundException")
        void notFound_throwsException() {
            when(bookRepository.findByIsbn("000-0")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.getBookByIsbn("000-0"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // searchBooks
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("searchBooks — 多维检索")
    class SearchBooks {

        @Test
        @DisplayName("成功：按作者/出版社过滤并按可借优先排序")
        void success_multidimensionalSearchWithAvailabilityPriority() {
            Book availableBook = TestDataFactory.createBook(2, "Java 并发编程实战", "978-7-121-15535-9");
            availableBook.setPublisher(TestDataFactory.createPublisher(11, "电子工业出版社"));
            availableBook.setCategory(testCategory);

            Author author = TestDataFactory.createAuthor(1, "Brian Goetz");
            BookAuthor relation = new BookAuthor();
            relation.setBook(availableBook);
            relation.setAuthor(author);
            relation.setAuthorOrder(1);
            availableBook.setBookAuthors(new java.util.HashSet<>(List.of(relation)));

            when(bookRepository.searchCatalog(
                    eq(null),
                    eq(null),
                    eq("brian"),
                    eq("电子"),
                    eq(20),
                    any(Pageable.class)))
                    .thenReturn(List.of(availableBook));
            when(bookCopyRepository.countAvailableCopiesByBookId(2)).thenReturn(3L);
            when(bookCopyRepository.countByBookBookId(2)).thenReturn(4L);
            when(reservationRepository.countPendingReservationsForBook(2)).thenReturn(1);
            when(loanRepository.countLoansForBookSince(eq(2), any())).thenReturn(5L);

            Page<BookDetailDto> result = bookService.searchBooks(
                    null,
                    null,
                    "Brian",
                    "电子",
                    20,
                    true,
                    "AVAILABILITY",
                    0,
                    10,
                    1);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getTitle()).isEqualTo("Java 并发编程实战");
            assertThat(result.getContent().get(0).getPendingReservationCount()).isEqualTo(1);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // createBook
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("createBook — 创建图书")
    class CreateBook {

        private BookCreateDto buildDto() {
            BookCreateDto dto = new BookCreateDto();
            dto.setIsbn("978-0-13-468599-1");
            dto.setTitle("Clean Code");
            dto.setPublisherId(10);
            dto.setCategoryId(20);
            dto.setAuthorIds(new ArrayList<>());
            dto.setCopyCount(2);
            dto.setPageCount(464);
            dto.setPublishedYear(2008);
            dto.setLanguage("en");
            return dto;
        }

        @Test
        @DisplayName("成功：新 ISBN，图书和副本均已创建")
        void success_newIsbn() {
            BookCreateDto dto = buildDto();

            when(bookRepository.findByIsbn(dto.getIsbn())).thenReturn(Optional.empty());
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(10)).thenReturn(Optional.of(testPublisher));
            when(categoryRepository.findById(20)).thenReturn(Optional.of(testCategory));
            when(bookRepository.save(any(Book.class))).thenReturn(testBook);
            when(bookCopyRepository.countAvailableCopiesByBookId(anyInt())).thenReturn(2L);

            BookDetailDto result = bookService.createBook(dto);

            assertThat(result).isNotNull();
            // 验证副本被创建了 2 次
            verify(bookCopyRepository, times(2)).save(any(BookCopy.class));
            verify(bookRepository).save(any(Book.class));
        }

        @Test
        @DisplayName("成功：仅线上资源可保存线上链接与访问策略且不创建实体副本")
        void success_digitalOnlyResource() {
            BookCreateDto dto = buildDto();
            dto.setResourceMode(Book.ResourceMode.DIGITAL_ONLY);
            dto.setOnlineAccessUrl("https://ebooks.example.com/clean-code");
            dto.setOnlineAccessType(Book.OnlineAccessType.LICENSED_ACCESS);
            dto.setCopyCount(0);

            when(bookRepository.findByIsbn(dto.getIsbn())).thenReturn(Optional.empty());
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(10)).thenReturn(Optional.of(testPublisher));
            when(categoryRepository.findById(20)).thenReturn(Optional.of(testCategory));
            when(bookRepository.save(any(Book.class))).thenAnswer(invocation -> {
                Book savedBook = invocation.getArgument(0);
                savedBook.setBookId(1);
                return savedBook;
            });
            when(bookCopyRepository.countAvailableCopiesByBookId(1)).thenReturn(0L);

            BookDetailDto result = bookService.createBook(dto);

            assertThat(result.getResourceMode()).isEqualTo(Book.ResourceMode.DIGITAL_ONLY);
            assertThat(result.getOnlineAccessUrl()).isEqualTo("https://ebooks.example.com/clean-code");
            assertThat(result.getOnlineAccessType()).isEqualTo(Book.OnlineAccessType.LICENSED_ACCESS);
            verify(bookCopyRepository, never()).save(any(BookCopy.class));
        }

        @Test
        @DisplayName("失败：ISBN 已存在，抛出 IllegalArgumentException")
        void fail_isbnAlreadyExists() {
            BookCreateDto dto = buildDto();
            when(bookRepository.findByIsbn(dto.getIsbn())).thenReturn(Optional.of(testBook));

            assertThatThrownBy(() -> bookService.createBook(dto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining(dto.getIsbn());

            verify(bookRepository, never()).save(any(Book.class));
        }

        @Test
        @DisplayName("失败：出版社 ID 不存在，抛出 ResourceNotFoundException")
        void fail_publisherNotFound() {
            BookCreateDto dto = buildDto();
            when(bookRepository.findByIsbn(dto.getIsbn())).thenReturn(Optional.empty());
            when(publisherRepository.findByPublisherIdAndIsDeletedFalse(10)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.createBook(dto))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("失败：仅线上资源缺少访问链接时被拒绝")
        void fail_digitalOnlyMissingOnlineUrl() {
            BookCreateDto dto = buildDto();
            dto.setResourceMode(Book.ResourceMode.DIGITAL_ONLY);
            dto.setOnlineAccessType(Book.OnlineAccessType.OPEN_ACCESS);
            dto.setCopyCount(0);

            when(bookRepository.findByIsbn(dto.getIsbn())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.createBook(dto))
                    .isInstanceOf(com.example.library.exception.BadRequestException.class)
                    .hasMessageContaining("Online access URL");
        }

        @Test
        @DisplayName("失败：仅线上资源不能创建实体副本")
        void fail_digitalOnlyWithPhysicalCopies() {
            BookCreateDto dto = buildDto();
            dto.setResourceMode(Book.ResourceMode.DIGITAL_ONLY);
            dto.setOnlineAccessUrl("https://ebooks.example.com/clean-code");
            dto.setOnlineAccessType(Book.OnlineAccessType.OPEN_ACCESS);
            dto.setCopyCount(2);

            when(bookRepository.findByIsbn(dto.getIsbn())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.createBook(dto))
                    .isInstanceOf(com.example.library.exception.BadRequestException.class)
                    .hasMessageContaining("physical copies");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // updateBook
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("updateBook — 更新图书")
    class UpdateBook {

        @Test
        @DisplayName("成功：更新标题，保存并返回更新结果")
        void success_updateTitle() {
            BookUpdateDto dto = new BookUpdateDto();
            dto.setTitle("深入理解 Java 虚拟机（第4版）");

            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));
            when(bookRepository.save(any(Book.class))).thenReturn(testBook);
            when(bookCopyRepository.countAvailableCopiesByBookId(anyInt())).thenReturn(0L);

            BookDetailDto result = bookService.updateBook(1, dto);

            assertThat(result).isNotNull();
            verify(bookRepository).save(testBook);
        }

        @Test
        @DisplayName("成功：切换为仅馆藏时清空线上资源字段")
        void success_clearOnlineFieldsWhenSwitchingToPhysicalOnly() {
            BookUpdateDto dto = new BookUpdateDto();
            dto.setResourceMode(Book.ResourceMode.PHYSICAL_ONLY);

            testBook.setResourceMode(Book.ResourceMode.HYBRID);
            testBook.setOnlineAccessUrl("https://example.com/book");
            testBook.setOnlineAccessType(Book.OnlineAccessType.LICENSED_ACCESS);

            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));
            when(bookRepository.save(any(Book.class))).thenReturn(testBook);
            when(bookCopyRepository.countAvailableCopiesByBookId(anyInt())).thenReturn(0L);

            BookDetailDto result = bookService.updateBook(1, dto);

            assertThat(result).isNotNull();
            assertThat(testBook.getResourceMode()).isEqualTo(Book.ResourceMode.PHYSICAL_ONLY);
            assertThat(testBook.getOnlineAccessUrl()).isNull();
            assertThat(testBook.getOnlineAccessType()).isNull();
        }

        @Test
        @DisplayName("成功：可为混合资源更新线上元数据")
        void success_updateHybridOnlineMetadata() {
            BookUpdateDto dto = new BookUpdateDto();
            dto.setResourceMode(Book.ResourceMode.HYBRID);
            dto.setOnlineAccessUrl("https://digital.example.com/jvm");
            dto.setOnlineAccessType(Book.OnlineAccessType.CAMPUS_ONLY);

            testBook.setResourceMode(Book.ResourceMode.PHYSICAL_ONLY);
            testBook.setOnlineAccessUrl(null);
            testBook.setOnlineAccessType(null);

            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));
            when(bookRepository.save(any(Book.class))).thenReturn(testBook);
            when(bookCopyRepository.countAvailableCopiesByBookId(anyInt())).thenReturn(2L);

            BookDetailDto result = bookService.updateBook(1, dto);

            assertThat(result.getResourceMode()).isEqualTo(Book.ResourceMode.HYBRID);
            assertThat(result.getOnlineAccessUrl()).isEqualTo("https://digital.example.com/jvm");
            assertThat(result.getOnlineAccessType()).isEqualTo(Book.OnlineAccessType.CAMPUS_ONLY);
        }

        @Test
        @DisplayName("失败：切换到混合资源但缺少线上链接时被拒绝")
        void fail_switchToHybridWithoutOnlineUrl() {
            BookUpdateDto dto = new BookUpdateDto();
            dto.setResourceMode(Book.ResourceMode.HYBRID);
            dto.setOnlineAccessType(Book.OnlineAccessType.CAMPUS_ONLY);

            testBook.setResourceMode(Book.ResourceMode.PHYSICAL_ONLY);

            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));

            assertThatThrownBy(() -> bookService.updateBook(1, dto))
                    .isInstanceOf(com.example.library.exception.BadRequestException.class)
                    .hasMessageContaining("Online access URL");

            verify(bookRepository, never()).save(any(Book.class));
        }

        @Test
        @DisplayName("失败：图书不存在，抛出 ResourceNotFoundException")
        void notFound_throwsException() {
            when(bookRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.updateBook(999, new BookUpdateDto()))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");

            verify(bookRepository, never()).save(any(Book.class));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // deleteBook
    // ═══════════════════════════════════════════════════════════════════════════
    @Nested
    @DisplayName("deleteBook — 软删除图书")
    class DeleteBook {

        @Test
        @DisplayName("成功：无活跃借阅，图书状态改为 INACTIVE，副本改为 DAMAGED")
        void success_softDelete() {
            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));
            when(loanRepository.countActiveLoansForBook(1)).thenReturn(0L);

            bookService.deleteBook(1);

            assertThat(testBook.getStatus()).isEqualTo(Book.BookStatus.INACTIVE);
            verify(bookRepository).save(testBook);
            verify(bookCopyRepository).updateStatusByBookId(BookCopy.CopyStatus.DAMAGED, 1);
        }

        @Test
        @DisplayName("失败：存在活跃借阅，抛出 IllegalStateException")
        void fail_hasActiveLoans() {
            when(bookRepository.findById(1)).thenReturn(Optional.of(testBook));
            when(loanRepository.countActiveLoansForBook(1)).thenReturn(2L);

            assertThatThrownBy(() -> bookService.deleteBook(1))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("active loans");

            verify(bookRepository, never()).save(any(Book.class));
        }

        @Test
        @DisplayName("失败：图书不存在，抛出 ResourceNotFoundException")
        void notFound_throwsException() {
            when(bookRepository.findById(999)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> bookService.deleteBook(999))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
