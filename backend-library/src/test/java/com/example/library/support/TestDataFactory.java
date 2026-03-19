package com.example.library.support;

import com.example.library.entity.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;

/**
 * 测试数据工厂——为 Service 层单元测试提供统一的测试实体构建方法。
 * <p>
 * 所有方法均为静态工厂方法，返回已初始化的实体对象，可在各测试类中直接调用。
 */
public class TestDataFactory {

    // ─── User ──────────────────────────────────────────────────────────────────

    /** 创建一个标准的测试用户（id=1, username="testuser"）。 */
    public static User createUser(Integer id, String username) {
        User user = new User();
        user.setUserId(id);
        user.setUsername(username);
        user.setEmail(username + "@test.com");
        user.setFullName("Test User " + id);
        user.setPasswordHash("hashed_password");
        user.setStatus(User.UserStatus.ACTIVE);
        user.setRoles(new HashSet<>());
        return user;
    }

    // ─── Book ──────────────────────────────────────────────────────────────────

    /** 创建一本处于 ACTIVE 状态的测试图书。 */
    public static Book createBook(Integer id, String title, String isbn) {
        Book book = new Book();
        book.setBookId(id);
        book.setTitle(title);
        book.setIsbn(isbn);
        book.setStatus(Book.BookStatus.ACTIVE);
        book.setBookAuthors(new HashSet<>());
        return book;
    }

    // ─── BookCopy ──────────────────────────────────────────────────────────────

    /** 创建一本状态为 AVAILABLE 的图书副本。 */
    public static BookCopy createAvailableCopy(Integer id, Book book) {
        BookCopy copy = new BookCopy();
        copy.setCopyId(id);
        copy.setBook(book);
        copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
        copy.setAcquisitionDate(LocalDate.now().minusMonths(1));
        copy.setPrice(BigDecimal.valueOf(39.90));
        return copy;
    }

    /** 创建一本指定状态的图书副本。 */
    public static BookCopy createCopy(Integer id, Book book, BookCopy.CopyStatus status) {
        BookCopy copy = createAvailableCopy(id, book);
        copy.setStatus(status);
        return copy;
    }

    // ─── Loan ──────────────────────────────────────────────────────────────────

    /** 创建一条活跃借阅记录（借阅日=今天，归还日=14天后）。 */
    public static Loan createActiveLoan(Integer id, User user, BookCopy copy) {
        Loan loan = new Loan();
        loan.setLoanId(id);
        loan.setUser(user);
        loan.setCopy(copy);
        loan.setBorrowDate(LocalDate.now());
        loan.setDueDate(LocalDate.now().plusDays(14));
        loan.setStatus(Loan.LoanStatus.ACTIVE);
        return loan;
    }

    /** 创建一条已逾期借阅记录（due date 在过去）。 */
    public static Loan createOverdueLoan(Integer id, User user, BookCopy copy) {
        Loan loan = createActiveLoan(id, user, copy);
        loan.setDueDate(LocalDate.now().minusDays(3));
        loan.setStatus(Loan.LoanStatus.OVERDUE);
        return loan;
    }

    // ─── Fine ──────────────────────────────────────────────────────────────────

    /** 创建一条 PENDING 状态的罚款记录。 */
    public static Fine createPendingFine(Integer id, User user, Loan loan, BigDecimal amount) {
        Fine fine = new Fine();
        fine.setFineId(id);
        fine.setUser(user);
        fine.setLoan(loan);
        fine.setAmount(amount);
        fine.setReason("Late return");
        fine.setDateIssued(LocalDate.now());
        fine.setStatus(Fine.FineStatus.PENDING);
        return fine;
    }

    // ─── Reservation ───────────────────────────────────────────────────────────

    /** 创建一条 PENDING 状态的预约记录。 */
    public static Reservation createPendingReservation(Integer id, User user, Book book) {
        Reservation reservation = new Reservation();
        reservation.setReservationId(id);
        reservation.setUser(user);
        reservation.setBook(book);
        reservation.setReservationDate(LocalDate.now());
        reservation.setExpiryDate(LocalDate.now().plusDays(14));
        reservation.setStatus(Reservation.ReservationStatus.PENDING);
        return reservation;
    }

    // ─── Category ──────────────────────────────────────────────────────────────

    /** 创建一个无父分类的分类。 */
    public static Category createCategory(Integer id, String name) {
        Category category = new Category();
        category.setCategoryId(id);
        category.setName(name);
        category.setDescription("Description for " + name);
        category.setDeleted(false);
        return category;
    }

    // ─── Publisher ─────────────────────────────────────────────────────────────

    /** 创建一个出版社。 */
    public static Publisher createPublisher(Integer id, String name) {
        Publisher publisher = new Publisher();
        publisher.setPublisherId(id);
        publisher.setName(name);
        publisher.setAddress("北京市海淀区");
        publisher.setContactInfo("010-12345678");
        publisher.setIsDeleted(false);
        return publisher;
    }

    // ─── Role ──────────────────────────────────────────────────────────────────

    /** 创建一个角色。 */
    public static Role createRole(Integer id, String name, String displayName) {
        Role role = new Role();
        role.setRoleId(id);
        role.setName(name);
        role.setDisplayName(displayName);
        role.setDescription("Role: " + displayName);
        role.setPermissions(new HashSet<>());
        return role;
    }

    /** 创建一个权限。 */
    public static Permission createPermission(Integer id, String name) {
        Permission permission = new Permission();
        permission.setPermissionId(id);
        permission.setName(name);
        permission.setDescription("Permission: " + name);
        permission.setCreateTime(LocalDateTime.now());
        return permission;
    }

    // ─── BookReview ────────────────────────────────────────────────────────────

    /** 创建一条图书评价。 */
    public static BookReview createReview(Long id, User user, Book book, BookReview.ReviewStatus status) {
        BookReview review = new BookReview();
        review.setReviewId(id);
        review.setUser(user);
        review.setBook(book);
        review.setRating(4);
        review.setCommentText("Good book!");
        review.setStatus(status);
        review.setCreateTime(LocalDateTime.now());
        return review;
    }

    // ─── Author ────────────────────────────────────────────────────────────────

    /** 创建一个作者。 */
    public static Author createAuthor(Integer id, String name) {
        Author author = new Author();
        author.setAuthorId(id);
        author.setName(name);
        author.setBiography("Biography of " + name);
        author.setBirthYear(1970);
        author.setDeleted(false);
        return author;
    }
}
