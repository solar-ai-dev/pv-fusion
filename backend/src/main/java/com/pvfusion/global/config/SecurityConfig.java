package com.pvfusion.global.config;

import com.pvfusion.adapter.out.auth.OAuth2LoginUserService;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private static final String AUTH_BASE_PATH = "/api/v1/auth";
    private static final String OAUTH2_CALLBACK_BASE_URI = AUTH_BASE_PATH + "/oauth2/callback/*";
    private static final String TRACE_HEADER_NAME = "X-Trace-Id";

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
            OAuth2LoginUserService oAuth2LoginUserService,
            @Value("${app.auth.oauth2.success-redirect-url}") String successRedirectUrl,
            @Value("${app.auth.oauth2.failure-redirect-url}") String failureRedirectUrl
    ) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable);
        http.cors(Customizer.withDefaults());
        http.authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health", "/actuator/health/**", "/error").permitAll()
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
                    .failureUrl(failureRedirectUrl)
                    .defaultSuccessUrl(successRedirectUrl, true)
            );
        } else {
            http.httpBasic(Customizer.withDefaults());
        }

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:}") String allowedOriginsProperty
    ) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(
                Arrays.stream(allowedOriginsProperty.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isEmpty())
                        .toList()
        );
        configuration.setAllowCredentials(true);
        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-Requested-With", "Accept", TRACE_HEADER_NAME));
        configuration.setExposedHeaders(List.of("Location", TRACE_HEADER_NAME));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
