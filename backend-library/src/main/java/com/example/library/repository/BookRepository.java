package com.example.library.repository;

import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for book queries.
 */
@Repository
public interface BookRepository extends JpaRepository<Book, Integer> {

    interface CategoryBookCountView {
        Integer getCategoryId();

        String getCategoryName();

        Long getBookCount();
    }

    Optional<Book> findByIsbn(String isbn);

    Page<Book> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.category.categoryId = :categoryId")
    Page<Book> findByCategoryId(@Param("categoryId") Integer categoryId, Pageable pageable);

    @Query("SELECT b FROM Book b JOIN b.bookAuthors ba JOIN ba.author a WHERE a.authorId = :authorId")
    Page<Book> findByAuthorId(@Param("authorId") Integer authorId, Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.publisher.publisherId = :publisherId")
    Page<Book> findByPublisherId(@Param("publisherId") Integer publisherId, Pageable pageable);

    @Query("""
            SELECT DISTINCT b
            FROM Book b
            LEFT JOIN b.bookAuthors ba
            LEFT JOIN ba.author a
            LEFT JOIN b.publisher p
            LEFT JOIN b.category c
            WHERE b.status = 'ACTIVE'
              AND (:categoryId IS NULL OR c.categoryId = :categoryId)
              AND (:title IS NULL OR LOWER(b.title) LIKE LOWER(CONCAT('%', :title, '%')))
              AND (:author IS NULL OR LOWER(COALESCE(a.name, '')) LIKE LOWER(CONCAT('%', :author, '%')))
              AND (:publisher IS NULL OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', :publisher, '%')))
              AND (
                    :keyword IS NULL
                    OR LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(a.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(p.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(c.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(b.isbn, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  )
            """)
    @EntityGraph(attributePaths = { "bookAuthors", "bookAuthors.author", "publisher", "category" })
    List<Book> searchCatalog(
            @Param("keyword") String keyword,
            @Param("title") String title,
            @Param("author") String author,
            @Param("publisher") String publisher,
            @Param("categoryId") Integer categoryId,
            Pageable pageable);

    @Override
    @EntityGraph(attributePaths = { "bookAuthors", "bookAuthors.author", "publisher", "category" })
    Page<Book> findAll(Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.createTime >= :since ORDER BY b.createTime DESC")
    Page<Book> findNewArrivals(@Param("since") java.time.LocalDateTime since, Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.bookId IN :bookIds")
    List<Book> findByIds(@Param("bookIds") List<Integer> bookIds);

    long countByStatus(Book.BookStatus status);

    @Query("""
            SELECT c.categoryId AS categoryId, c.name AS categoryName, COUNT(b.bookId) AS bookCount
            FROM Book b
            JOIN b.category c
            WHERE b.status = :status
            GROUP BY c.categoryId, c.name
            ORDER BY COUNT(b.bookId) DESC
            """)
    List<CategoryBookCountView> countBooksByCategory(@Param("status") Book.BookStatus status);

    // ── 个人推荐所需查询 ──────────────────────────────────────────

    /** 按分类查找用户未读的活跃图书。 */
    @Query("""
            SELECT b FROM Book b
            WHERE b.category.categoryId IN :categoryIds
              AND b.bookId NOT IN :excludeBookIds
              AND b.status = 'ACTIVE'
            ORDER BY b.createTime DESC
            """)
    List<Book> findByCategoryIdsExcluding(
            @Param("categoryIds") List<Integer> categoryIds,
            @Param("excludeBookIds") List<Integer> excludeBookIds,
            Pageable pageable);

    /** 按作者查找用户未读的活跃图书。 */
    @Query("""
            SELECT DISTINCT b FROM Book b
            JOIN b.bookAuthors ba
            WHERE ba.author.authorId IN :authorIds
              AND b.bookId NOT IN :excludeBookIds
              AND b.status = 'ACTIVE'
            ORDER BY b.createTime DESC
            """)
    List<Book> findByAuthorIdsExcluding(
            @Param("authorIds") List<Integer> authorIds,
            @Param("excludeBookIds") List<Integer> excludeBookIds,
            Pageable pageable);

    /** 按书名或描述模糊匹配关键词（用于兴趣标签推荐）。 */
    @Query(value = """
            SELECT * FROM books b
            WHERE b.status = 'ACTIVE'
              AND b.book_id NOT IN (:excludeBookIds)
              AND (LOWER(b.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(b.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY b.create_time DESC
            """, nativeQuery = true)
    List<Book> findByKeywordExcluding(
            @Param("keyword") String keyword,
            @Param("excludeBookIds") List<Integer> excludeBookIds,
            Pageable pageable);
}
