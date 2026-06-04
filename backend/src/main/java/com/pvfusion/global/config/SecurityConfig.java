package com.pvfusion.global.config;

import com.pvfusion.adapter.out.auth.OAuth2LoginUserService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
            OAuth2LoginUserService oAuth2LoginUserService
    ) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable);
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/error").permitAll()
                .anyRequest().authenticated()
        );

        if (clientRegistrationRepositoryProvider.getIfAvailable() != null) {
            http.oauth2Login(oauth2 -> oauth2
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
