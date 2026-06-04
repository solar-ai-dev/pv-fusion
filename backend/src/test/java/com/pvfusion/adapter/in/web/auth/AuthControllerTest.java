package com.pvfusion.adapter.in.web.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pvfusion.adapter.out.auth.OAuth2LoginUserService;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.port.in.user.GetCurrentUserUseCase;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.config.SecurityConfig;
import com.pvfusion.global.error.GlobalExceptionHandler;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GetCurrentUserUseCase getCurrentUserUseCase;

    @MockitoBean
    private OAuth2LoginUserService oAuth2LoginUserService;

    @MockitoBean
    private ClientRegistrationRepository clientRegistrationRepository;

    @Test
    void returnsCurrentUserResponse() throws Exception {
        OffsetDateTime now = OffsetDateTime.parse("2026-06-05T10:15:30+09:00");
        UserResponse response = new UserResponse(
                1L,
                "user@example.com",
                "\uD64D\uAE38\uB3D9",
                "google",
                "google-123",
                UserRole.USER,
                AccountStatus.APPROVED,
                now,
                now.minusDays(1),
                now,
                List.of()
        );
        when(getCurrentUserUseCase.execute(any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/auth/me").with(user("tester")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.email").value("user@example.com"))
                .andExpect(jsonPath("$.data.accountStatus").value("APPROVED"))
                .andExpect(jsonPath("$.message").value("\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uC870\uD68C\uD588\uC2B5\uB2C8\uB2E4."));

        verify(getCurrentUserUseCase).execute(any());
    }

    @Test
    void returnsUnauthorizedWhenRequestIsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsNoContentOnLogout() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout").with(user("tester")))
                .andExpect(status().isNoContent());
    }

    @Test
    void redirectsGoogleEndpointToSpringSecurityAuthorizationEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/auth/google"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/oauth2/authorization/google"));
    }
}
