package com.pvfusion;

import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.service.image.ImageService;
import com.pvfusion.service.imagepair.ImagePairService;
import com.pvfusion.service.inspection.InspectionService;
import com.pvfusion.service.analysis.AnalysisJobService;
import com.pvfusion.service.result.AnalysisResultService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
@ActiveProfiles("test")
class PvFusionApplicationTests {

    @MockitoBean
    private CurrentUserPort currentUserPort;

    @MockitoBean
    private UserRepositoryPort userRepositoryPort;

    @MockitoBean
    private ClientRegistrationRepository clientRegistrationRepository;

    @MockitoBean
    private InspectionService inspectionService;

    @MockitoBean
    private ImageService imageService;

    @MockitoBean
    private ImagePairService imagePairService;

    @MockitoBean
    private AnalysisJobService analysisJobService;

    @MockitoBean
    private AnalysisResultService analysisResultService;

    @Test
    void contextLoads() {
    }
}
