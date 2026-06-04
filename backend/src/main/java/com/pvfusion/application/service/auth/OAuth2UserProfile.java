package com.pvfusion.application.service.auth;

public record OAuth2UserProfile(
        String email,
        String name,
        String provider,
        String providerUserId
) {
}
