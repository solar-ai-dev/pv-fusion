package com.pvfusion;

import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class PvFusionApplicationTests {

	@MockitoBean
	private UserRepositoryPort userRepositoryPort;

	@MockitoBean
	private CurrentUserPort currentUserPort;

	@MockitoBean
	private ClientRegistrationRepository clientRegistrationRepository;

	@Test
	void contextLoads() {
	}

}
