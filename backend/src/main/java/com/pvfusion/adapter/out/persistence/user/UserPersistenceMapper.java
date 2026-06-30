package com.pvfusion.adapter.out.persistence.user;

import com.pvfusion.domain.user.User;
import org.springframework.stereotype.Component;

@Component
public class UserPersistenceMapper {

    public User toDomain(UserJpaEntity entity) {
        return new User(
                entity.getId(),
                entity.getEmail(),
                entity.getName(),
                entity.getProvider(),
                entity.getProviderUserId(),
                entity.getRole(),
                entity.getAccountStatus(),
                entity.getLastLoginAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public UserJpaEntity toEntity(User user) {
        return UserJpaEntity.fromDomain(user);
    }

    public UserJpaEntity updateEntity(User user, UserJpaEntity entity) {
        entity.apply(user);
        return entity;
    }
}
