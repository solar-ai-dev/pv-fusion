package com.pvfusion.adapter.out.persistence.user;

import com.pvfusion.application.dto.user.UserListQuery;
import com.pvfusion.application.dto.user.UserSummaryResponse;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.user.User;
import com.pvfusion.global.response.PageResponse;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserPersistenceAdapter implements UserRepositoryPort {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final UserJpaRepository userJpaRepository;
    private final UserPersistenceMapper userPersistenceMapper;

    @Override
    public PageResponse<UserSummaryResponse> findAll(UserListQuery query) {
        PageRequest pageable = PageRequest.of(
                Math.max(query.page(), 0),
                query.size() > 0 ? query.size() : DEFAULT_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, "id")
        );

        Page<UserSummaryResponse> page = userJpaRepository.search(
                        normalizeKeyword(query.keyword()),
                        query.role(),
                        query.accountStatus(),
                        pageable
                )
                .map(this::toSummaryResponse);

        return PageResponse.from(page);
    }

    @Override
    public Optional<User> findById(Long userId) {
        return userJpaRepository.findById(userId).map(userPersistenceMapper::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userJpaRepository.findByEmail(email).map(userPersistenceMapper::toDomain);
    }

    @Override
    public Optional<User> findByProviderAndProviderUserId(String provider, String providerUserId) {
        return userJpaRepository.findByProviderAndProviderUserId(provider, providerUserId)
                .map(userPersistenceMapper::toDomain);
    }

    @Override
    @Transactional
    public User save(User user) {
        UserJpaEntity entity = user.getId() == null
                ? userPersistenceMapper.toEntity(user)
                : userJpaRepository.findById(user.getId())
                        .map(existing -> userPersistenceMapper.updateEntity(user, existing))
                        .orElseGet(() -> userPersistenceMapper.toEntity(user));

        return userPersistenceMapper.toDomain(userJpaRepository.save(entity));
    }

    private UserSummaryResponse toSummaryResponse(UserJpaEntity entity) {
        return new UserSummaryResponse(
                entity.getId(),
                entity.getEmail(),
                entity.getName(),
                entity.getRole(),
                entity.getAccountStatus(),
                entity.getLastLoginAt()
        );
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }
}
