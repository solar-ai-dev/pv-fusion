package com.pvfusion.adapter.in.web.auth;

import com.pvfusion.application.dto.user.GetCurrentUserQuery;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.port.in.user.GetCurrentUserUseCase;
import com.pvfusion.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String GOOGLE_AUTHORIZATION_PATH = "/oauth2/authorization/google";
    private static final String GET_CURRENT_USER_MESSAGE = "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uC870\uD68C\uD588\uC2B5\uB2C8\uB2E4.";

    private final GetCurrentUserUseCase getCurrentUserUseCase;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        UserResponse userResponse = getCurrentUserUseCase.execute(new GetCurrentUserQuery(null));
        return ResponseEntity.ok(ApiResponse.success(userResponse, GET_CURRENT_USER_MESSAGE));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) {
        logoutHandler.logout(request, response, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/google")
    public ResponseEntity<Void> redirectToGoogleLogin() {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(GOOGLE_AUTHORIZATION_PATH).toString())
                .build();
    }
}
