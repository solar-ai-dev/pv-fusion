package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.GetUserQuery;
import com.pvfusion.application.dto.user.UserResponse;

public interface GetUserUseCase {

    UserResponse execute(GetUserQuery query);
}
