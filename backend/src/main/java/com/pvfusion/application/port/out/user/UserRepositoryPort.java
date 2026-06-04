package com.pvfusion.application.port.out.user;

import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.domain.user.User;
import com.pvfusion.global.response.PageResponse;
import java.util.Optional;

public interface UserRepositoryPort {

    PageResponse<UserSummaryResponse> findAll(UserListQuery query);

    Optional<User> findById(Long userId);

    Optional<User> findByProviderAndProviderUserId(String provider, String providerUserId);

    User save(User user);
}
