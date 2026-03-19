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
}
