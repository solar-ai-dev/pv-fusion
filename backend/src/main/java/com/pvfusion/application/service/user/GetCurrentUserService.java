package com.pvfusion.application.service.user;

import com.pvfusion.application.dto.user.GetCurrentUserQuery;
import com.pvfusion.application.dto.user.UserResponse;
import com.pvfusion.application.port.in.user.GetCurrentUserUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.global.error.NotFoundException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GetCurrentUserService implements GetCurrentUserUseCase {

    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;

    @Override
    public UserResponse execute(GetCurrentUserQuery query) {
        Long currentUserId = currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);

        User user = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("현재 사용자 정보를 찾을 수 없습니다."));

        validateAccountStatus(user);

        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getProvider(),
                user.getProviderUserId(),
                user.getRole(),
                user.getAccountStatus(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                Collections.emptyList()
        );
    }

    private void validateAccountStatus(User user) {
        if (user.getAccountStatus() == AccountStatus.INACTIVE) {
            throw new UserDeactivatedException();
        }
    }
}
