package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.global.response.PageResponse;

public interface QueryUserUseCase {

    PageResponse<UserSummaryResponse> execute(UserListQuery query);
}
