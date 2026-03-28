package com.example.library.repository;

import com.example.library.entity.Loan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Repository for loan queries.
 */
@Repository
public interface LoanRepository extends JpaRepository<Loan, Integer> {

    Page<Loan> findByUserUserId(Integer userId, Pageable pageable);

    Page<Loan> findByUserUserIdAndStatusIn(Integer userId, java.util.List<Loan.LoanStatus> statuses, Pageable pageable);

    List<Loan> findByUserUserIdAndStatusInOrderByDueDateAsc(Integer userId, Collection<Loan.LoanStatus> statuses);

    Page<Loan> findByStatus(Loan.LoanStatus status, Pageable pageable);

    Page<Loan> findAllByOrderByBorrowDateDescLoanIdDesc(Pageable pageable);

    @Query("SELECT l FROM Loan l WHERE l.status IN ('ACTIVE', 'OVERDUE') AND l.dueDate <= :today")
    List<Loan> findOverdueLoans(@Param("today") LocalDate today);

    @Query("SELECT l FROM Loan l WHERE l.user.userId = :userId AND l.status = 'ACTIVE'")
    List<Loan> findActiveLoansForUser(@Param("userId") Integer userId);

    @Query("SELECT l FROM Loan l WHERE l.copy.book.bookId = :bookId AND l.status = 'ACTIVE'")
    List<Loan> findActiveLoansForBook(@Param("bookId") Integer bookId);

    @Query("SELECT COUNT(l) FROM Loan l WHERE l.user.userId = :userId AND l.status = 'ACTIVE'")
    Long countActiveLoansForUser(@Param("userId") Integer userId);

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM Loan l
            WHERE l.user.userId = :userId
              AND l.copy.book.bookId = :bookId
              AND l.status IN ('ACTIVE', 'OVERDUE')
            """)
    boolean existsActiveLoanForUserAndBook(@Param("userId") Integer userId, @Param("bookId") Integer bookId);

    @Query("SELECT l FROM Loan l WHERE l.dueDate = :date AND l.status = 'ACTIVE'")
    List<Loan> findLoansByDueDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(l) FROM Loan l WHERE l.status IN ('ACTIVE', 'OVERDUE')")
    long countAllActiveAndOverdueLoans();

    @Query("SELECT COUNT(l) FROM Loan l WHERE l.status = 'OVERDUE' OR (l.status = 'ACTIVE' AND l.dueDate < CURRENT_DATE)")
    long countActualOverdueLoans();

    @Query("SELECT COUNT(l) FROM Loan l WHERE l.copy.book.bookId = :bookId AND l.status = 'ACTIVE'")
    long countActiveLoansForBook(@Param("bookId") Integer bookId);

    @Query("""
            SELECT l.borrowDate, COUNT(l)
            FROM Loan l
            WHERE l.borrowDate >= :startDate
            GROUP BY l.borrowDate
            ORDER BY l.borrowDate ASC
            """)
    List<Object[]> countBorrowedByDateSince(@Param("startDate") LocalDate startDate);

    @Query("""
            SELECT l.returnDate, COUNT(l)
            FROM Loan l
            WHERE l.returnDate IS NOT NULL AND l.returnDate >= :startDate
            GROUP BY l.returnDate
            ORDER BY l.returnDate ASC
            """)
    List<Object[]> countReturnedByDateSince(@Param("startDate") LocalDate startDate);

    @Query("SELECT l.copy.book.bookId FROM Loan l WHERE l.createTime >= :since GROUP BY l.copy.book.bookId ORDER BY COUNT(l) DESC")
    List<Integer> findTrendingBookIds(@Param("since") java.time.LocalDateTime since, Pageable pageable);

    @Query("SELECT COUNT(l) FROM Loan l WHERE l.copy.book.bookId = :bookId AND l.createTime >= :since")
    long countLoansForBookSince(@Param("bookId") Integer bookId, @Param("since") java.time.LocalDateTime since);

    // ── 个人推荐所需查询 ──────────────────────────────────────────

    /** 查询用户借阅过的所有图书分类 ID（去重）。 */
    @Query("SELECT DISTINCT l.copy.book.category.categoryId FROM Loan l WHERE l.user.userId = :userId AND l.copy.book.category IS NOT NULL")
    List<Integer> findBorrowedCategoryIds(@Param("userId") Integer userId);

    /** 查询用户借阅过的所有作者 ID（去重）。 */
    @Query("SELECT DISTINCT ba.author.authorId FROM Loan l JOIN l.copy.book.bookAuthors ba WHERE l.user.userId = :userId")
    List<Integer> findBorrowedAuthorIds(@Param("userId") Integer userId);

    /** 查询用户已经借阅过的所有图书 ID（去重，用于排除已读）。 */
    @Query("SELECT DISTINCT l.copy.book.bookId FROM Loan l WHERE l.user.userId = :userId")
    List<Integer> findBorrowedBookIds(@Param("userId") Integer userId);

    /** 查询与当前用户有相似借阅记录的其他用户（至少借过同一本书），返回相似度最高的 N 名用户。 */
    @Query("""
            SELECT l2.user.userId
            FROM Loan l1
            JOIN Loan l2 ON l1.copy.book.bookId = l2.copy.book.bookId
            WHERE l1.user.userId = :userId
              AND l2.user.userId <> :userId
            GROUP BY l2.user.userId
            ORDER BY COUNT(DISTINCT l2.copy.book.bookId) DESC
            """)
    List<Integer> findSimilarUserIds(@Param("userId") Integer userId, Pageable pageable);

    /** 查询指定用户群体借阅的图书 ID，按借阅次数排序（用于协同过滤）。 */
    @Query("""
            SELECT l.copy.book.bookId
            FROM Loan l
            WHERE l.user.userId IN :userIds
              AND l.copy.book.bookId NOT IN :excludeBookIds
              AND l.copy.book.status = 'ACTIVE'
            GROUP BY l.copy.book.bookId
            ORDER BY COUNT(l) DESC
            """)
    List<Integer> findBookIdsBorrowedByUsers(
            @Param("userIds") List<Integer> userIds,
            @Param("excludeBookIds") List<Integer> excludeBookIds,
            Pageable pageable);
}
