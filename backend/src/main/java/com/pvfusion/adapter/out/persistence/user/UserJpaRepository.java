package com.pvfusion.adapter.out.persistence.user;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.UserRole;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserJpaRepository extends JpaRepository<UserJpaEntity, Long> {

    Optional<UserJpaEntity> findByEmail(String email);

    Optional<UserJpaEntity> findByProviderAndProviderUserId(String provider, String providerUserId);

    @Query("""
            select u
            from UserJpaEntity u
            where (:keyword is null
                or lower(u.email) like lower(concat('%', :keyword, '%'))
                or lower(u.name) like lower(concat('%', :keyword, '%')))
              and (:role is null or u.role = :role)
              and (:accountStatus is null or u.accountStatus = :accountStatus)
            """)
    Page<UserJpaEntity> search(
            @Param("keyword") String keyword,
            @Param("role") UserRole role,
            @Param("accountStatus") AccountStatus accountStatus,
            Pageable pageable
    );
}
