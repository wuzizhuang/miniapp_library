package com.example.library.controller;

import com.example.library.dto.LoanCreateDto;
import com.example.library.dto.LoanDto;
import com.example.library.entity.Loan;
import com.example.library.security.AuthEntryPointJwt;
import com.example.library.security.JwtUtils;
import com.example.library.security.SecurityConfig;
import com.example.library.security.UserDetailsImpl;
import com.example.library.security.UserDetailsServiceImpl;
import com.example.library.service.LoanSecurityService;
import com.example.library.service.LoanService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication; // 导入 Authentication
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// 明确测试 LoanController
@WebMvcTest(LoanController.class)
@Import({ SecurityConfig.class, AuthEntryPointJwt.class })
public class LoanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private LoanService loanService;

    // 注入安全服务，用于在测试中控制权限检查结果
    @Autowired
    private LoanSecurityService loanSecurityService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    private LoanDto testLoanDto;
    private LoanCreateDto testLoanCreateDto;
    private Page<LoanDto> loanPage;

    // --- 替代 @MockitoBean 的配置 ---
    @TestConfiguration
    static class LoanServiceTestConfig {
        @Bean
        public LoanService loanService() {
            // Mock LoanService 接口
            return Mockito.mock(LoanService.class);
        }

        @Bean
        public LoanSecurityService loanSecurityService() {
            // Mock LoanSecurityService 接口，用于 @PreAuthorize 检查
            return Mockito.mock(LoanSecurityService.class);
        }
    }
    // ----------------------------

    @BeforeEach
    void setUp() {
        Mockito.reset(loanService, loanSecurityService);
        // 1. 准备 LoanDto
        testLoanDto = new LoanDto();
        testLoanDto.setLoanId(101);
        testLoanDto.setUserId(1);
        testLoanDto.setBookTitle("测试书籍 A");
        testLoanDto.setStatus(Loan.LoanStatus.valueOf("ACTIVE"));
        testLoanDto.setBorrowDate(LocalDate.now());

        // 2. 准备 LoanCreateDto
        testLoanCreateDto = new LoanCreateDto();
        testLoanCreateDto.setUserId(1);
        testLoanCreateDto.setCopyId(5);

        // 3. 准备分页结果
        loanPage = new PageImpl<>(Arrays.asList(testLoanDto));
    }

    // =========================================================================
    // 1. 查询端点测试
    // =========================================================================

    @Test
    @WithMockUser(roles = "ADMIN") // 权限要求: hasRole('ADMIN')
    void testGetAllLoans_Admin_Success() throws Exception {
        when(loanService.getAllLoans(anyInt(), anyInt(), anyString(), anyString(), nullable(String.class)))
                .thenReturn(loanPage);

        mockMvc.perform(get("/api/loans")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].loanId", is(101)));

        verify(loanService).getAllLoans(0, 10, "borrowDate", "DESC", null);
    }

    @Test
    @WithMockUser(roles = "USER") // 权限要求: hasRole('ADMIN')，USER无权限
    void testGetAllLoans_User_Forbidden() throws Exception {
        mockMvc.perform(get("/api/loans"))
                .andExpect(status().isForbidden());

        verify(loanService, never()).getAllLoans(anyInt(), anyInt(), anyString(), anyString(), nullable(String.class));
    }

    @Test
    @WithMockUser(username = "testUser", roles = "USER") // 权限要求: ADMIN 或 LoanOwner
    void testGetLoanById_Owner_Success() throws Exception {
        // Mock 权限服务，使其返回 true (当前用户是所有者)
        when(loanSecurityService.isLoanOwner(any(Authentication.class), eq(101))).thenReturn(true);
        when(loanService.getLoanById(101)).thenReturn(testLoanDto);

        mockMvc.perform(get("/api/loans/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanId", is(101)));

        verify(loanService).getLoanById(101);
    }

    @Test
    @WithMockUser(username = "testUser", roles = "USER")
    void testGetLoanById_NotOwner_Forbidden() throws Exception {
        // Mock 权限服务，使其返回 false (当前用户不是所有者)
        when(loanSecurityService.isLoanOwner(any(Authentication.class), eq(102))).thenReturn(false);

        mockMvc.perform(get("/api/loans/102"))
                .andExpect(status().isForbidden());

        verify(loanService, never()).getLoanById(anyInt());
    }

    // =========================================================================
    // 2. 事务操作端点测试
    // =========================================================================

    @Test
    void testCreateLoan_Success() throws Exception {
        UserDetailsImpl userDetails = new UserDetailsImpl(
                1,
                "testUser",
                "test@example.com",
                "password",
                "Test User",
                List.of(
                        new SimpleGrantedAuthority("ROLE_USER"),
                        new SimpleGrantedAuthority("loan:write")));
        when(loanService.createLoan(any(LoanCreateDto.class))).thenReturn(testLoanDto);

        mockMvc.perform(post("/api/loans")
                .with(user(userDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testLoanCreateDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loanId", is(101)))
                .andExpect(jsonPath("$.status", is("ACTIVE")));

        verify(loanService).createLoan(any(LoanCreateDto.class));
    }

    @Test
    void testCreateLoan_ReadOnlyOperatorForbidden() throws Exception {
        UserDetailsImpl userDetails = new UserDetailsImpl(
                1,
                "reader",
                "reader@example.com",
                "password",
                "Reader",
                List.of(
                        new SimpleGrantedAuthority("ROLE_USER"),
                        new SimpleGrantedAuthority("loan:read")));

        mockMvc.perform(post("/api/loans")
                        .with(user(userDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testLoanCreateDto)))
                .andExpect(status().isForbidden());

        verify(loanService, never()).createLoan(any(LoanCreateDto.class));
    }

    @Test
    void testCreateLoan_LoanWriteOperatorSuccess() throws Exception {
        UserDetailsImpl userDetails = new UserDetailsImpl(
                9,
                "operator",
                "operator@example.com",
                "password",
                "Loan Operator",
                List.of(
                        new SimpleGrantedAuthority("ROLE_USER"),
                        new SimpleGrantedAuthority("loan:write")));
        when(loanService.createLoan(any(LoanCreateDto.class))).thenReturn(testLoanDto);

        mockMvc.perform(post("/api/loans")
                        .with(user(userDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testLoanCreateDto)))
                .andExpect(status().isCreated());

        verify(loanService).createLoan(argThat(dto -> dto.getUserId().equals(9)));
    }

    @Test
    void testCreateLoan_Unauthorized() throws Exception { // 未认证用户
        mockMvc.perform(post("/api/loans")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testLoanCreateDto)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "testUser", roles = "USER") // 权限要求: ADMIN 或 LoanOwner
    void testReturnLoan_Owner_Success() throws Exception {
        // 设置归还后的状态
        LoanDto returnedDto = new LoanDto();
        returnedDto.setLoanId(103);
        returnedDto.setStatus(Loan.LoanStatus.valueOf("RETURNED"));

        when(loanSecurityService.isLoanOwner(any(Authentication.class), eq(103))).thenReturn(true);
        when(loanService.returnLoan(103)).thenReturn(returnedDto);

        mockMvc.perform(put("/api/loans/103/return"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RETURNED")));

        verify(loanService).returnLoan(103);
    }

    @Test
    @WithMockUser(username = "testUser", roles = "USER")
    void testRenewLoan_NotOwner_Forbidden() throws Exception {
        // Mock 权限服务，使其返回 false
        when(loanSecurityService.isLoanOwner(any(Authentication.class), eq(104))).thenReturn(false);

        mockMvc.perform(put("/api/loans/104/renew"))
                .andExpect(status().isForbidden());

        verify(loanService, never()).renewLoan(anyInt());
    }

    @Test
    @WithMockUser(roles = "ADMIN") // 权限要求: ADMIN 或 LoanOwner
    void testMarkLoanAsLost_Admin_Success() throws Exception {
        // 设置丢失后的状态
        LoanDto lostDto = new LoanDto();
        lostDto.setLoanId(105);
        lostDto.setStatus(Loan.LoanStatus.valueOf("LOST"));

        when(loanService.markLoanAsLost(105)).thenReturn(lostDto);

        mockMvc.perform(put("/api/loans/105/lost"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("LOST")));

        verify(loanService).markLoanAsLost(105);
    }

    @Test
    @WithMockUser(roles = "USER") // 普通用户不能标记丢失（此权限已收回）
    void testMarkLoanAsLost_User_Forbidden() throws Exception {
        mockMvc.perform(put("/api/loans/105/lost"))
                .andExpect(status().isForbidden());

        verify(loanService, never()).markLoanAsLost(anyInt());
    }

    @Test
    @WithMockUser(username = "librarian", authorities = { "ROLE_USER", "loan:manage" })
    void testMarkLoanAsLost_Librarian_Success() throws Exception {
        LoanDto lostDto = new LoanDto();
        lostDto.setLoanId(106);
        lostDto.setStatus(Loan.LoanStatus.valueOf("LOST"));

        when(loanService.markLoanAsLost(106)).thenReturn(lostDto);

        mockMvc.perform(put("/api/loans/106/lost"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("LOST")));

        verify(loanService).markLoanAsLost(106);
    }

    // =========================================================================
    // 3. 特殊端点测试
    // =========================================================================

    @Test
    @WithMockUser(roles = "ADMIN") // 权限要求: hasRole('ADMIN')
    void testGetOverdueLoans_Admin_Success() throws Exception {
        LoanDto overdueDto = new LoanDto();
        overdueDto.setLoanId(200);
        overdueDto.setStatus(Loan.LoanStatus.valueOf("OVERDUE"));

        when(loanService.getOverdueLoans(anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(Arrays.asList(overdueDto)));

        mockMvc.perform(get("/api/loans/overdue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].status", is("OVERDUE")));

        verify(loanService).getOverdueLoans(0, 20);
    }

    @Test
    @WithMockUser(roles = "USER") // 权限要求: hasRole('ADMIN')，USER无权限
    void testGetOverdueLoans_User_Forbidden() throws Exception {
        mockMvc.perform(get("/api/loans/overdue"))
                .andExpect(status().isForbidden());

        verify(loanService, never()).checkForOverdueLoans();
    }
}
