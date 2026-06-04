package com.pvfusion.application.port.out.user;

import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.domain.user.User;
import java.util.List;
import java.util.Optional;

public interface LoadUserPort {

    Optional<User> loadUser(Long userId);

    List<User> loadUsers(UserListQuery query);

    long countUsers(UserListQuery query);
}
