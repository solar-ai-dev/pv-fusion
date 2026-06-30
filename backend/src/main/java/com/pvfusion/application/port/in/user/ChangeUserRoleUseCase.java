package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.ChangeUserRoleCommand;
import com.pvfusion.application.dto.user.UserResponse;

public interface ChangeUserRoleUseCase {

    UserResponse execute(ChangeUserRoleCommand command);
}
