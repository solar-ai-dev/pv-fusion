package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.ApproveUserCommand;
import com.pvfusion.application.dto.user.UserResponse;

public interface ApproveUserUseCase {

    UserResponse execute(ApproveUserCommand command);
}
