package com.pvfusion.global.security;

import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import java.util.Collection;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

@RequiredArgsConstructor
public class PvFusionOAuth2User implements OAuth2User, AuthenticatedUserPrincipal {

    private final User user;
    private final OAuth2User delegate;
    private final String nameAttributeKey;

    @Override
    public Map<String, Object> getAttributes() {
        return delegate.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    @Override
    public String getName() {
        Object nameAttribute = delegate.getAttributes().get(nameAttributeKey);
        return nameAttribute != null ? String.valueOf(nameAttribute) : String.valueOf(user.getId());
    }

    @Override
    public Long getUserId() {
        return user.getId();
    }

    @Override
    public String getEmail() {
        return user.getEmail();
    }

    @Override
    public String getDisplayName() {
        return user.getName();
    }

    @Override
    public UserRole getRole() {
        return user.getRole();
    }

    @Override
    public AccountStatus getAccountStatus() {
        return user.getAccountStatus();
    }
}
