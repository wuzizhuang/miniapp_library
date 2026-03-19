package com.example.library.controller;

import com.example.library.entity.ServiceAppointment;
import com.example.library.entity.User;
import com.example.library.repository.ServiceAppointmentRepository;
import com.example.library.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.profiles.active=test",
        "spring.datasource.url=jdbc:h2:mem:service-appointment-controller-test;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
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
class ServiceAppointmentControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ServiceAppointmentRepository appointmentRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        appointmentRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setUsername("appointment-admin-reader");
        user.setPasswordHash("hashed-password");
        user.setEmail("appointment-admin-reader@test.com");
        user.setFullName("Appointment Admin Reader");
        user.setRole(User.UserRole.USER);
        user.setStatus(User.UserStatus.ACTIVE);
        user = userRepository.save(user);

        ServiceAppointment appointment = new ServiceAppointment();
        appointment.setUser(user);
        appointment.setServiceType(ServiceAppointment.ServiceType.CONSULTATION);
        appointment.setScheduledTime(LocalDateTime.of(2026, 3, 8, 10, 0));
        appointment.setMethod(ServiceAppointment.ServiceMethod.COUNTER);
        appointment.setStatus(ServiceAppointment.AppointmentStatus.PENDING);
        appointment.setNotes("integration-check");
        appointmentRepository.save(appointment);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllAppointments_includesConsultationAppointmentsWithoutLoan() throws Exception {
        mockMvc.perform(get("/api/service-appointments").param("page", "0").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].serviceType").value("CONSULTATION"))
                .andExpect(jsonPath("$.content[0].bookTitle").isEmpty())
                .andExpect(jsonPath("$.content[0].username").value("appointment-admin-reader"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }
}
