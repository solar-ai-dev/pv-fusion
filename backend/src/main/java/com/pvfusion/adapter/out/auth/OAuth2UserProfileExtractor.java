package com.pvfusion.adapter.out.auth;

import com.pvfusion.application.service.auth.OAuth2UserProfile;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class OAuth2UserProfileExtractor {

    public OAuth2UserProfile extract(String registrationId, Map<String, Object> attributes) {
        String email = readRequiredString(attributes, "email");
        String name = readOptionalString(attributes, "name");
        String providerUserId = resolveProviderUserId(attributes);
        String provider = registrationId.toUpperCase(Locale.ROOT);

        return new OAuth2UserProfile(
                email,
                name != null && !name.isBlank() ? name : email,
                provider,
                providerUserId
        );
    }

    private String resolveProviderUserId(Map<String, Object> attributes) {
        String subject = readOptionalString(attributes, "sub");
        if (subject != null && !subject.isBlank()) {
            return subject;
        }

        String id = readOptionalString(attributes, "id");
        if (id != null && !id.isBlank()) {
            return id;
        }

        throw new IllegalArgumentException("OAuth2 사용자 식별자(sub 또는 id)가 없습니다.");
    }

    private String readRequiredString(Map<String, Object> attributes, String key) {
        String value = readOptionalString(attributes, key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("OAuth2 사용자 정보에 " + key + " 값이 없습니다.");
        }
        return value;
    }

    private String readOptionalString(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        return value != null ? String.valueOf(value) : null;
    }
}
