package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.GetCurrentUserQuery;
import com.pvfusion.application.dto.user.UserResponse;

public interface GetCurrentUserUseCase {

    UserResponse execute(GetCurrentUserQuery query);
}
