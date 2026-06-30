package com.pvfusion.application.port.in.user;

import com.pvfusion.application.dto.user.DeactivateUserCommand;
import com.pvfusion.application.dto.user.UserResponse;

public interface DeactivateUserUseCase {

    UserResponse execute(DeactivateUserCommand command);
}
