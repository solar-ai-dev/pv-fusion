package com.pvfusion.global.config;

import com.pvfusion.adapter.out.auth.OAuth2LoginUserService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private static final String AUTH_BASE_PATH = "/api/v1/auth";
    private static final String OAUTH2_CALLBACK_BASE_URI = AUTH_BASE_PATH + "/oauth2/callback/*";

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
            OAuth2LoginUserService oAuth2LoginUserService
    ) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable);
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/error").permitAll()
                .requestMatchers(
                        AUTH_BASE_PATH + "/google",
                        AUTH_BASE_PATH + "/oauth2/callback/**",
                        "/oauth2/**",
                        "/login/oauth2/**"
                ).permitAll()
                .requestMatchers(
                        AUTH_BASE_PATH + "/me",
                        AUTH_BASE_PATH + "/logout"
                ).authenticated()
                .anyRequest().authenticated()
        );
        http.exceptionHandling(exceptionHandling -> exceptionHandling
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        );

        if (clientRegistrationRepositoryProvider.getIfAvailable() != null) {
            http.oauth2Login(oauth2 -> oauth2
                    .redirectionEndpoint(redirection -> redirection
                            .baseUri(OAUTH2_CALLBACK_BASE_URI)
                    )
                    .userInfoEndpoint(userInfo -> userInfo
                            .userService(oAuth2LoginUserService::loadOAuth2User)
                            .oidcUserService(oAuth2LoginUserService::loadOidcUser)
                    )
            );
        } else {
            http.httpBasic(Customizer.withDefaults());
        }

        return http.build();
    }
}
