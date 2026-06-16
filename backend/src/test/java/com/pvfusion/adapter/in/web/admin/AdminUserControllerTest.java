package com.pvfusion.adapter.in.web.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.application.port.in.user.ApproveUserUseCase;
import com.pvfusion.application.port.in.user.ChangeUserRoleUseCase;
import com.pvfusion.application.port.in.user.DeactivateUserUseCase;
import com.pvfusion.application.port.in.user.GetUserUseCase;
import com.pvfusion.application.port.in.user.QueryUserUseCase;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.error.GlobalExceptionHandler;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    @Mock private QueryUserUseCase queryUserUseCase;
    @Mock private GetUserUseCase getUserUseCase;
    @Mock private ApproveUserUseCase approveUserUseCase;
    @Mock private ChangeUserRoleUseCase changeUserRoleUseCase;
    @Mock private DeactivateUserUseCase deactivateUserUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminUserController(
                queryUserUseCase,
                getUserUseCase,
                approveUserUseCase,
                changeUserRoleUseCase,
                deactivateUserUseCase
        ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("승인 대기 사용자 목록 조회 성공 응답은 공통 success wrapper를 반환한다")
    void getPendingUsersReturnsOk() throws Exception {
        when(queryUserUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new UserSummaryResponse(1L, "user@example.com", "User", UserRole.USER, AccountStatus.PENDING, now())),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/admin/users/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.content[0].userId").value(1L));
    }

    @Test
    void getUsersReturnsOk() throws Exception {
        when(queryUserUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new UserSummaryResponse(1L, "user@example.com", "User", UserRole.USER, AccountStatus.APPROVED, now())),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].email").value("user@example.com"));
    }

    @Test
    void getUserReturnsOk() throws Exception {
        when(getUserUseCase.execute(any())).thenReturn(sampleUserResponse());

        mockMvc.perform(get("/api/v1/admin/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(1L));
    }

    @Test
    void approveUserReturnsOk() throws Exception {
        when(approveUserUseCase.execute(any())).thenReturn(sampleUserResponse());

        mockMvc.perform(patch("/api/v1/admin/users/1/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(1L));
    }

    @Test
    void changeUserRoleReturnsOk() throws Exception {
        when(changeUserRoleUseCase.execute(any())).thenReturn(sampleUserResponse());

        mockMvc.perform(patch("/api/v1/admin/users/1/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeUserRoleRequest(UserRole.ADMIN))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(1L));
    }

    @Test
    void deactivateUserReturnsOk() throws Exception {
        when(deactivateUserUseCase.execute(any())).thenReturn(sampleUserResponse());

        mockMvc.perform(patch("/api/v1/admin/users/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(1L));
    }

    @Test
    void changeUserRoleRejectsUnknownRole() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/users/1/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "UNKNOWN"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/admin/users/1/role"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        org.mockito.Mockito.verify(changeUserRoleUseCase, never()).execute(any());
    }

    @Test
    void changeUserRoleRejectsMissingRole() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/users/1/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/admin/users/1/role"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        org.mockito.Mockito.verify(changeUserRoleUseCase, never()).execute(any());
    }

    private UserResponse sampleUserResponse() {
        return new UserResponse(
                1L, "user@example.com", "User", "google", "google-1", UserRole.USER, AccountStatus.APPROVED,
                now(), now().minusDays(1), now(), List.of()
        );
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
