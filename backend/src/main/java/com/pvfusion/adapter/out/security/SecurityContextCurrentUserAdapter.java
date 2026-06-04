package com.pvfusion.adapter.out.security;

import com.pvfusion.application.port.out.auth.CurrentUserPort;
import java.util.Map;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextCurrentUserAdapter implements CurrentUserPort {

    private static final String USER_ID_ATTRIBUTE = "userId";
    private static final String ID_ATTRIBUTE = "id";

    @Override
    public Optional<Long> getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!isAuthenticated(authentication)) {
            return Optional.empty();
        }

        Optional<Long> principalUserId = extractUserId(authentication.getPrincipal());
        if (principalUserId.isPresent()) {
            return principalUserId;
        }

        Optional<Long> detailUserId = extractUserId(authentication.getDetails());
        if (detailUserId.isPresent()) {
            return detailUserId;
        }

        return parseLong(authentication.getName());
    }

    @Override
    public boolean isAuthenticated() {
        return isAuthenticated(SecurityContextHolder.getContext().getAuthentication());
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getPrincipal());
    }

    private Optional<Long> extractUserId(Object source) {
        if (source == null) {
            return Optional.empty();
        }

        if (source instanceof Long value) {
            return Optional.of(value);
        }

        if (source instanceof Integer value) {
            return Optional.of(value.longValue());
        }

        if (source instanceof OidcUser oidcUser) {
            Optional<Long> userId = extractUserId(oidcUser.getClaims());
            if (userId.isPresent()) {
                return userId;
            }
        }

        if (source instanceof OAuth2User oauth2User) {
            Optional<Long> userId = extractUserId(oauth2User.getAttributes());
            if (userId.isPresent()) {
                return userId;
            }
        }

        if (source instanceof Map<?, ?> attributes) {
            Optional<Long> userId = extractMapValue(attributes, USER_ID_ATTRIBUTE);
            if (userId.isPresent()) {
                return userId;
            }
            return extractMapValue(attributes, ID_ATTRIBUTE);
        }

        return parseLong(source.toString());
    }

    private Optional<Long> extractMapValue(Map<?, ?> values, String key) {
        if (!values.containsKey(key)) {
            return Optional.empty();
        }
        return parseLong(values.get(key));
    }

    private Optional<Long> parseLong(Object value) {
        if (value == null) {
            return Optional.empty();
        }

        if (value instanceof Number number) {
            return Optional.of(number.longValue());
        }

        try {
            return Optional.of(Long.parseLong(String.valueOf(value)));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }
}
