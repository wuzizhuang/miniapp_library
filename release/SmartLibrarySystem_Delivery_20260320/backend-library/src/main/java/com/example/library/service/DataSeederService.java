package com.example.library.service;

import com.example.library.entity.*;
import com.example.library.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.datafaker.Faker;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * Generates seed data for development and demos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataSeederService {

    private final UserRepository userRepository;
    private final AuthorRepository authorRepository;
    private final BookRepository bookRepository;
    private final BookAuthorRepository bookAuthorRepository;
    private final BookCopyRepository bookCopyRepository;
    private final CategoryRepository categoryRepository;
    private final PublisherRepository publisherRepository;
    private final LoanRepository loanRepository;
    private final FineRepository fineRepository;
    private final ReservationRepository reservationRepository;
    private final NotificationRepository notificationRepository;
    private final UserBehaviorLogRepository userBehaviorLogRepository;
    private final SeatRepository seatRepository;
    private final SeatReservationRepository seatReservationRepository;
    private final PasswordEncoder passwordEncoder;

    private final Faker faker = new Faker(new Locale("zh-CN"));

    /**
     * Seeds the database with synthetic data.
     */
    @Transactional
    public void seedFullData(int userCount, int bookCount) {
        log.info("开始生成全量测试数据...");

        List<User> users = generateUsers(userCount);
        List<Category> categories = ensureCategories();
        List<Publisher> publishers = ensurePublishers();
        List<Author> authors = generateAuthors(bookCount / 2);

        List<Book> books = generateBooksAndCopies(bookCount, categories, publishers, authors);
        List<Seat> seats = ensureSeats();

        generateLoanHistory(users, books);

        generateReservations(users, books);

        generateSeatReservations(users, seats);

        generateUserBehaviors(users, books);

        generateNotifications(users);

        log.info("全量数据生成完毕！");
    }

    private List<User> generateUsers(int count) {
        List<User> allUsers = new ArrayList<>(userRepository.findAll());
        String commonPwd = passwordEncoder.encode("123456");

        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPasswordHash(commonPwd);
            admin.setEmail("admin@library.com");
            admin.setFullName("超级管理员");
            admin.setRole(User.UserRole.ADMIN);
            // admin.setStatus(User.UserStatus.ACTIVE);
            allUsers.add(userRepository.save(admin));
        }

        long existingNonAdmin = allUsers.stream()
                .filter(user -> !"admin".equalsIgnoreCase(user.getUsername()))
                .count();
        int needToCreate = Math.max(0, count - (int) existingNonAdmin);
        if (needToCreate == 0) {
            return allUsers;
        }

        List<User> newUsers = new ArrayList<>();
        for (int i = 0; i < needToCreate; i++) {
            User user = new User();
            user.setUsername("user_" + i + "_" + faker.number().digits(4));
            user.setPasswordHash(commonPwd);
            user.setEmail(faker.internet().emailAddress());
            user.setFullName(faker.name().fullName());
            user.setRole(User.UserRole.USER);
            // user.setStatus(faker.random().nextInt(100) < 5 ? User.UserStatus.INACTIVE :
            // User.UserStatus.ACTIVE);
            user.setIdentityType(User.IdentityType.STUDENT);
            user.setDepartment(faker.university().name() + "计算机系");
            user.setEnrollmentYear(faker.number().numberBetween(2019, 2024));
            user.setInterestTags("[\"" + faker.book().genre() + "\", \"" + faker.book().genre() + "\"]");
            newUsers.add(user);
        }
        allUsers.addAll(userRepository.saveAll(newUsers));
        return allUsers;
    }

    private List<Book> generateBooksAndCopies(int count, List<Category> cats, List<Publisher> pubs,
            List<Author> auths) {
        List<Book> books = new ArrayList<>(bookRepository.findAll());
        int needToCreate = Math.max(0, count - books.size());
        if (needToCreate == 0) {
            return books;
        }

        for (int i = 0; i < needToCreate; i++) {
            Book book = new Book();
            book.setIsbn(faker.code().isbn13());
            book.setTitle(faker.book().title());
            book.setDescription(faker.lorem().paragraph(5));
            book.setPageCount(faker.number().numberBetween(150, 800));
            book.setPublishedYear(faker.number().numberBetween(1990, 2024));
            book.setLanguage("中文");
            book.setCategory(cats.get(faker.random().nextInt(cats.size())));
            book.setPublisher(pubs.get(faker.random().nextInt(pubs.size())));
            book.setCoverUrl("https://picsum.photos/seed/" + book.getIsbn() + "/200/300");
            book.setStatus(Book.BookStatus.ACTIVE);

            Book savedBook = bookRepository.save(book);
            books.add(savedBook);

            int authorCount = faker.number().numberBetween(1, 3);
            for (int j = 0; j < authorCount; j++) {
                BookAuthor ba = new BookAuthor(savedBook, auths.get(faker.random().nextInt(auths.size())), j + 1);
                bookAuthorRepository.save(ba);
            }

            int copyCount = faker.number().numberBetween(5, 10);
            for (int k = 0; k < copyCount; k++) {
                BookCopy copy = new BookCopy();
                copy.setBook(savedBook);
                copy.setStatus(BookCopy.CopyStatus.AVAILABLE);
                copy.setAcquisitionDate(LocalDate.now().minusDays(faker.number().numberBetween(100, 1000)));
                copy.setPrice(BigDecimal.valueOf(faker.number().randomDouble(2, 30, 150)));
                copy.setLocationCode("区-" + faker.number().digits(2) + "-架-" + faker.number().digits(2));
                copy.setRfidTag(UUID.randomUUID().toString());
                bookCopyRepository.save(copy);
            }
        }
        return books;
    }

    private void generateLoanHistory(List<User> users, List<Book> books) {
        for (Book book : books) {
            List<BookCopy> copies = bookCopyRepository.findByBookBookId(book.getBookId());
            if (copies.isEmpty())
                continue;

            for (BookCopy copy : copies) {
                int random = faker.random().nextInt(100);
                User randomUser = users.get(faker.random().nextInt(users.size()));

                if (random < 30) {
                    createHistoricalLoan(copy, randomUser);
                } else if (random < 50) {
                    createActiveLoan(copy, randomUser, false);
                } else if (random < 60) {
                    createActiveLoan(copy, randomUser, true);
                }
            }
        }
    }

    private void createHistoricalLoan(BookCopy copy, User user) {
        Loan loan = new Loan();
        loan.setCopy(copy);
        loan.setUser(user);
        // 借书时间：过去 100-60 天
        LocalDate borrowDate = LocalDate.now().minusDays(faker.number().numberBetween(60, 100));
        loan.setBorrowDate(borrowDate);
        loan.setDueDate(borrowDate.plusDays(14));
        // 还书时间：借书后 5-20 天
        loan.setReturnDate(borrowDate.plusDays(faker.number().numberBetween(5, 20)));
        loan.setStatus(Loan.LoanStatus.RETURNED);
        loanRepository.save(loan);
    }

    private void createActiveLoan(BookCopy copy, User user, boolean isOverdue) {
        // 更新 Copy 状态
        copy.setStatus(BookCopy.CopyStatus.BORROWED);
        bookCopyRepository.save(copy);

        Loan loan = new Loan();
        loan.setCopy(copy);
        loan.setUser(user);

        if (isOverdue) {
            // 逾期：借书时间在 20 天前 (默认借期14天，所以现在逾期了6天)
            LocalDate borrowDate = LocalDate.now().minusDays(faker.number().numberBetween(20, 40));
            loan.setBorrowDate(borrowDate);
            loan.setDueDate(borrowDate.plusDays(14));
            loan.setStatus(Loan.LoanStatus.OVERDUE);
            Loan savedLoan = loanRepository.save(loan);

            // 生成罚款
            createFine(savedLoan, user);
        } else {
            // 正常：借书时间在 1-10 天前
            LocalDate borrowDate = LocalDate.now().minusDays(faker.number().numberBetween(1, 10));
            loan.setBorrowDate(borrowDate);
            loan.setDueDate(borrowDate.plusDays(14));
            loan.setStatus(Loan.LoanStatus.ACTIVE);
            loanRepository.save(loan);
        }
    }

    private void createFine(Loan loan, User user) {
        Fine fine = new Fine();
        fine.setLoan(loan);
        fine.setUser(user);
        fine.setAmount(BigDecimal.valueOf(faker.number().randomDouble(2, 1, 20)));
        fine.setReason("逾期归还");
        fine.setDateIssued(LocalDate.now());
        // 50% 概率未支付
        fine.setStatus(faker.bool().bool() ? Fine.FineStatus.PENDING : Fine.FineStatus.PAID);
        if (fine.getStatus() == Fine.FineStatus.PAID) {
            fine.setDatePaid(LocalDate.now());
        }
        fineRepository.save(fine);
    }

    // ========================================================================
    // 4. 预约数据 (O2O 场景)
    // ========================================================================
    private void generateReservations(List<User> users, List<Book> books) {
        // 随机选一些书生成预约
        for (int i = 0; i < books.size() / 5; i++) {
            Book book = books.get(i);
            User user = users.get(faker.random().nextInt(users.size()));

            Reservation res = new Reservation();
            res.setBook(book);
            res.setUser(user);
            res.setReservationDate(LocalDate.now());
            res.setExpiryDate(LocalDate.now().plusDays(7));

            // 50% 是普通排队，50% 是已锁定库存(O2O)
            if (faker.bool().bool()) {
                // 普通排队
                res.setStatus(Reservation.ReservationStatus.PENDING);
            } else {
                // 尝试找一个 Available 的副本锁定
                List<BookCopy> availableCopies = bookCopyRepository.findAvailableCopiesByBookId(book.getBookId());
                if (!availableCopies.isEmpty()) {
                    BookCopy copy = availableCopies.get(0);
                    // 核心逻辑：更新副本状态
                    copy.setStatus(BookCopy.CopyStatus.RESERVED);
                    bookCopyRepository.save(copy);

                    res.setStatus(Reservation.ReservationStatus.AWAITING_PICKUP);
                    res.setAllocatedCopy(copy);
                    res.setPickupDeadline(LocalDateTime.now().plusDays(3));
                    res.setNotificationSent(true);
                } else {
                    res.setStatus(Reservation.ReservationStatus.PENDING);
                }
            }
            reservationRepository.save(res);
        }
    }

    // ========================================================================
    // 5. 用户行为日志 (浏览、搜索、点赞) - 推荐系统的数据源
    // ========================================================================
    private void generateUserBehaviors(List<User> users, List<Book> books) {
        List<UserBehaviorLog> logs = new ArrayList<>();
        // 生成 200 条行为记录
        for (int i = 0; i < 200; i++) {
            UserBehaviorLog log = new UserBehaviorLog();
            log.setUserId(users.get(faker.random().nextInt(users.size())).getUserId());
            log.setBookId(books.get(faker.random().nextInt(books.size())).getBookId());

            int actionRandom = faker.random().nextInt(100);
            if (actionRandom < 60)
                log.setActionType(UserBehaviorLog.ActionType.VIEW_DETAIL);
            else if (actionRandom < 80)
                log.setActionType(UserBehaviorLog.ActionType.CLICK_PREVIEW);
            else
                log.setActionType(UserBehaviorLog.ActionType.ADD_TO_SHELF);

            log.setDurationSeconds(faker.number().numberBetween(10, 300));
            log.setDeviceType(faker.bool().bool() ? "mobile" : "web");

            // 随机生成过去30天的时间
            Date randomDate = faker.date().past(30, TimeUnit.DAYS);
            LocalDateTime localDateTime = randomDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
            log.setCreateTime(localDateTime); // 注意：Entity需去掉 @CreationTimestamp 才能手动设置时间，或者在数据库层面改

            logs.add(log);
        }
        userBehaviorLogRepository.saveAll(logs);
    }

    // ========================================================================
    // 6. 通知消息
    // ========================================================================
    private void generateNotifications(List<User> users) {
        List<Notification> notifications = new ArrayList<>();
        for (User user : users) {
            if (faker.bool().bool()) { // 50%的用户有消息
                Notification n = new Notification();
                n.setUser(user);
                n.setTitle("系统通知");
                n.setContent("欢迎使用智慧图书馆系统！");
                n.setType(Notification.NotificationType.SYSTEM);
                n.setIsRead(faker.bool().bool());
                notifications.add(n);
            }
        }
        notificationRepository.saveAll(notifications);
    }

    private List<Seat> ensureSeats() {
        List<Seat> existingSeats = seatRepository.findAll();
        if (!existingSeats.isEmpty()) {
            return existingSeats;
        }

        List<Seat> seats = new ArrayList<>();
        seats.add(createSeat("A101", "一层", 1, "安静自习区", "东区", true, true, Seat.SeatType.STANDARD));
        seats.add(createSeat("A102", "一层", 1, "安静自习区", "东区", true, false, Seat.SeatType.STANDARD));
        seats.add(createSeat("A201", "二层", 2, "计算机阅览区", "西区", true, false, Seat.SeatType.COMPUTER));
        seats.add(createSeat("A202", "二层", 2, "计算机阅览区", "西区", true, true, Seat.SeatType.COMPUTER));
        seats.add(createSeat("B301", "三层", 3, "研讨区", "北区", false, false, Seat.SeatType.DISCUSSION));
        seats.add(createSeat("B302", "三层", 3, "研讨区", "北区", false, true, Seat.SeatType.DISCUSSION));
        return seatRepository.saveAll(seats);
    }

    private Seat createSeat(
            String seatCode,
            String floorName,
            int floorOrder,
            String zoneName,
            String areaName,
            boolean hasPower,
            boolean nearWindow,
            Seat.SeatType seatType) {
        Seat seat = new Seat();
        seat.setSeatCode(seatCode);
        seat.setFloorName(floorName);
        seat.setFloorOrder(floorOrder);
        seat.setZoneName(zoneName);
        seat.setAreaName(areaName);
        seat.setHasPower(hasPower);
        seat.setNearWindow(nearWindow);
        seat.setSeatType(seatType);
        seat.setStatus(Seat.SeatStatus.AVAILABLE);
        seat.setDescription("支持移动端预约的馆内座位");
        return seat;
    }

    private void generateSeatReservations(List<User> users, List<Seat> seats) {
        if (seatReservationRepository.count() > 0 || seats.isEmpty() || users.isEmpty()) {
            return;
        }

        List<User> readerUsers = users.stream()
                .filter(user -> user.getRole() == User.UserRole.USER)
                .toList();
        if (readerUsers.isEmpty()) {
            return;
        }

        List<SeatReservation> reservations = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        SeatReservation active = new SeatReservation();
        active.setSeat(seats.get(0));
        active.setUser(readerUsers.get(0));
        active.setStartTime(now.plusHours(2));
        active.setEndTime(now.plusHours(5));
        active.setStatus(SeatReservation.ReservationStatus.ACTIVE);
        active.setNotes("准备算法设计课程复习");
        reservations.add(active);

        if (readerUsers.size() > 1 && seats.size() > 1) {
            SeatReservation upcoming = new SeatReservation();
            upcoming.setSeat(seats.get(1));
            upcoming.setUser(readerUsers.get(1));
            upcoming.setStartTime(now.plusDays(1).withHour(9).withMinute(0).withSecond(0).withNano(0));
            upcoming.setEndTime(now.plusDays(1).withHour(12).withMinute(0).withSecond(0).withNano(0));
            upcoming.setStatus(SeatReservation.ReservationStatus.ACTIVE);
            upcoming.setNotes("毕业设计资料整理");
            reservations.add(upcoming);
        }

        if (seats.size() > 2) {
            SeatReservation completed = new SeatReservation();
            completed.setSeat(seats.get(2));
            completed.setUser(readerUsers.get(0));
            completed.setStartTime(now.minusDays(1).withHour(14).withMinute(0).withSecond(0).withNano(0));
            completed.setEndTime(now.minusDays(1).withHour(17).withMinute(0).withSecond(0).withNano(0));
            completed.setStatus(SeatReservation.ReservationStatus.COMPLETED);
            completed.setNotes("已完成的示例预约");
            reservations.add(completed);
        }

        seatReservationRepository.saveAll(reservations);
    }

    // 辅助方法 (保持不变)
    private List<Category> ensureCategories() {
        if (categoryRepository.count() > 0)
            return categoryRepository.findAll();
        return Arrays.asList(
                saveCat("计算机科学", "编程与算法"),
                saveCat("文学", "小说与散文"),
                saveCat("历史", "中国史与世界史"),
                saveCat("经济管理", "金融与营销"));
    }

    private Category saveCat(String name, String desc) {
        Category c = new Category();
        c.setName(name);
        c.setDescription(desc);
        return categoryRepository.save(c);
    }

    private List<Publisher> ensurePublishers() {
        if (publisherRepository.count() > 0)
            return publisherRepository.findAll();
        List<Publisher> list = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            Publisher p = new Publisher();
            p.setName(faker.book().publisher() + "出版社");
            p.setAddress(faker.address().fullAddress());
            list.add(publisherRepository.save(p));
        }
        return list;
    }

    private List<Author> generateAuthors(int count) {
        List<Author> authors = new ArrayList<>(authorRepository.findAll());
        int needToCreate = Math.max(0, count - authors.size());
        if (needToCreate == 0) {
            return authors;
        }

        List<Author> newAuthors = new ArrayList<>();
        for (int i = 0; i < needToCreate; i++) {
            Author a = new Author();
            a.setName(faker.book().author());
            a.setBiography(faker.lorem().paragraph());
            newAuthors.add(a);
        }
        authors.addAll(authorRepository.saveAll(newAuthors));
        return authors;
    }
}
