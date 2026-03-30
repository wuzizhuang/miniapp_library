package com.example.library.controller;

import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.entity.Fine;
import com.example.library.entity.Loan;
import com.example.library.entity.User;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.BookRepository;
import com.example.library.repository.FineRepository;
import com.example.library.repository.LoanRepository;
import com.example.library.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.profiles.active=test",
        "spring.datasource.url=jdbc:h2:mem:fine-controller-test;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "spring.jpa.open-in-view=false",
        "app.mail.enabled=false",
        "app.security.redis-enabled=false",
        "app.cache.redis-enabled=false"
})
@AutoConfigureMockMvc
class FineControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FineRepository fineRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Autowired
    private BookCopyRepository bookCopyRepository;

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        fineRepository.deleteAll();
        loanRepository.deleteAll();
        bookCopyRepository.deleteAll();
        bookRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setUsername("fine-admin-reader");
        user.setPasswordHash("hashed-password");
        user.setEmail("fine-admin-reader@test.com");
        user.setFullName("Fine Admin Reader");
        user.setRole(User.UserRole.USER);
        user.setStatus(User.UserStatus.ACTIVE);
        user = userRepository.save(user);

        Book book = new Book();
        book.setIsbn("9780000000001");
        book.setTitle("Fine Controller Integration");
        book.setPublishedYear(2024);
        book.setLanguage("中文");
        book.setStatus(Book.BookStatus.ACTIVE);
        book = bookRepository.save(book);

        BookCopy copy = new BookCopy();
        copy.setBook(book);
        copy.setStatus(BookCopy.CopyStatus.BORROWED);
        copy.setAcquisitionDate(LocalDate.now().minusMonths(1));
        copy.setPrice(new BigDecimal("68.00"));
        copy = bookCopyRepository.save(copy);

        Loan loan = new Loan();
        loan.setCopy(copy);
        loan.setUser(user);
        loan.setBorrowDate(LocalDate.now().minusDays(14));
        loan.setDueDate(LocalDate.now().minusDays(3));
        loan.setStatus(Loan.LoanStatus.OVERDUE);
        loan = loanRepository.save(loan);

        Fine fine = new Fine();
        fine.setLoan(loan);
        fine.setUser(user);
        fine.setAmount(new BigDecimal("12.50"));
        fine.setReason("Late return");
        fine.setDateIssued(LocalDate.now().minusDays(1));
        fine.setStatus(Fine.FineStatus.PENDING);
        fineRepository.save(fine);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllFines_returnsPagedResultWhenLazyRelationsAreNeeded() throws Exception {
        mockMvc.perform(get("/api/fines").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].bookTitle").value("Fine Controller Integration"))
                .andExpect(jsonPath("$.content[0].username").value("fine-admin-reader"))
                .andExpect(jsonPath("$.content[0].status").value("PENDING"))
                .andExpect(jsonPath("$.content[0].amount").value(12.50));
    }
}
