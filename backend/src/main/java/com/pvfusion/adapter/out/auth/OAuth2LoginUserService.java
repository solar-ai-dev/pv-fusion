package com.pvfusion.adapter.out.auth;

import com.pvfusion.application.service.auth.OAuth2UserProfile;
import com.pvfusion.application.service.auth.OAuth2UserProvisioningService;
import com.pvfusion.domain.user.User;
import com.pvfusion.global.security.PvFusionOAuth2User;
import com.pvfusion.global.security.PvFusionOidcUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OAuth2LoginUserService {

    private final OAuth2UserProfileExtractor profileExtractor;
    private final OAuth2UserProvisioningService provisioningService;

    public OAuth2User loadOAuth2User(OAuth2UserRequest userRequest) {
        DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
        OAuth2User oauth2User = delegate.loadUser(userRequest);
        OAuth2UserProfile profile = extractProfile(
                userRequest.getClientRegistration().getRegistrationId(),
                oauth2User.getAttributes()
        );
        User user = provisioningService.provisionOrUpdate(profile);

        String nameAttributeKey = userRequest.getClientRegistration()
                .getProviderDetails()
                .getUserInfoEndpoint()
                .getUserNameAttributeName();

        return new PvFusionOAuth2User(user, oauth2User, nameAttributeKey);
    }

    public OidcUser loadOidcUser(OidcUserRequest userRequest) {
        OidcUserService delegate = new OidcUserService();
        OidcUser oidcUser = delegate.loadUser(userRequest);
        OAuth2UserProfile profile = extractProfile(
                userRequest.getClientRegistration().getRegistrationId(),
                oidcUser.getClaims()
        );
        User user = provisioningService.provisionOrUpdate(profile);

        return new PvFusionOidcUser(user, oidcUser);
    }

    private OAuth2UserProfile extractProfile(String registrationId, java.util.Map<String, Object> attributes) {
        try {
            return profileExtractor.extract(registrationId, attributes);
        } catch (IllegalArgumentException exception) {
            OAuth2Error error = new OAuth2Error("invalid_user_info", exception.getMessage(), null);
            throw new OAuth2AuthenticationException(error, exception.getMessage(), exception);
        }
    }
}
