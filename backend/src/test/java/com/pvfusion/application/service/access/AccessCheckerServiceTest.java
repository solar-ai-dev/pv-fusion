package com.pvfusion.application.service.access;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.equipment.EquipmentRepositoryPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.plant.PlantMemberRepositoryPort;
import com.pvfusion.application.port.out.plant.PlantRepositoryPort;
import com.pvfusion.application.port.out.result.LoadAnalysisResultPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.application.port.out.zone.ZoneRepositoryPort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.equipment.EquipmentType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.image.UploadStatus;
import com.pvfusion.domain.imagepair.ImagePair;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.domain.plant.Plant;
import com.pvfusion.domain.result.AnalysisResult;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.domain.zone.Zone;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccessCheckerServiceTest {

    @Mock
    private UserRepositoryPort userRepositoryPort;
    @Mock
    private PlantRepositoryPort plantRepositoryPort;
    @Mock
    private PlantMemberRepositoryPort plantMemberRepositoryPort;
    @Mock
    private ZoneRepositoryPort zoneRepositoryPort;
    @Mock
    private EquipmentRepositoryPort equipmentRepositoryPort;
    @Mock
    private LoadInspectionPort loadInspectionPort;
    @Mock
    private LoadImagePort loadImagePort;
    @Mock
    private LoadImagePairPort loadImagePairPort;
    @Mock
    private LoadAnalysisJobPort loadAnalysisJobPort;
    @Mock
    private LoadAnalysisResultPort loadAnalysisResultPort;

    private AccessCheckerService accessCheckerService;

    @BeforeEach
    void setUp() {
        accessCheckerService = new AccessCheckerService(
                userRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                zoneRepositoryPort,
                equipmentRepositoryPort,
                loadInspectionPort,
                loadImagePort,
                loadImagePairPort,
                Optional.of(loadAnalysisJobPort),
                Optional.of(loadAnalysisResultPort)
        );
    }

    @Test
    void isAdminReturnsTrueForApprovedAdmin() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.APPROVED)));

        assertThat(accessCheckerService.isAdmin(1L)).isTrue();
    }

    @Test
    void isAdminReturnsFalseForApprovedUser() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.USER, AccountStatus.APPROVED)));

        assertThat(accessCheckerService.isAdmin(1L)).isFalse();
    }

    @Test
    void isAdminReturnsFalseForPendingAdmin() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.PENDING)));

        assertThat(accessCheckerService.isAdmin(1L)).isFalse();
    }

    @Test
    void isAdminReturnsFalseForInactiveAdmin() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.INACTIVE)));

        assertThat(accessCheckerService.isAdmin(1L)).isFalse();
    }

    @Test
    void isAdminReturnsFalseForMissingUser() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.empty());

        assertThat(accessCheckerService.isAdmin(1L)).isFalse();
    }

    @Test
    void isAdminReturnsFalseForNullUserId() {
        assertThat(accessCheckerService.isAdmin(null)).isFalse();
    }

    @Test
    void checkPlantAccessReturnsTrueForAdminWhenPlantExists() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));

        assertThat(accessCheckerService.checkPlantAccess(1L, 10L)).isTrue();
    }

    @Test
    void checkPlantAccessReturnsFalseForAdminWhenPlantMissing() {
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.empty());

        assertThat(accessCheckerService.checkPlantAccess(1L, 10L)).isFalse();
    }

    @Test
    void checkPlantAccessReturnsTrueForApprovedUserWithActiveMembership() {
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkPlantAccess(2L, 10L)).isTrue();
    }

    @Test
    void checkPlantAccessReturnsFalseForInactiveMembership() {
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(false);

        assertThat(accessCheckerService.checkPlantAccess(2L, 10L)).isFalse();
    }

    @Test
    void checkPlantAccessReturnsFalseForPendingUser() {
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.PENDING)));

        assertThat(accessCheckerService.checkPlantAccess(2L, 10L)).isFalse();
    }

    @Test
    void checkPlantAccessReturnsFalseForMissingPlant() {
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.empty());

        assertThat(accessCheckerService.checkPlantAccess(2L, 10L)).isFalse();
    }

    @Test
    void checkPlantAccessReturnsFalseForNullInput() {
        assertThat(accessCheckerService.checkPlantAccess(null, 10L)).isFalse();
        assertThat(accessCheckerService.checkPlantAccess(2L, null)).isFalse();
    }

    @Test
    void checkZoneAccessReturnsTrueWhenPlantAccessExists() {
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkZoneAccess(2L, 20L)).isTrue();
    }

    @Test
    void checkZoneAccessReturnsFalseWhenZoneMissing() {
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.empty());

        assertThat(accessCheckerService.checkZoneAccess(2L, 20L)).isFalse();
    }

    @Test
    void checkEquipmentAccessReturnsTrueWhenZoneAccessExists() {
        when(equipmentRepositoryPort.findById(30L)).thenReturn(Optional.of(equipment(30L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkEquipmentAccess(2L, 30L)).isTrue();
    }

    @Test
    void checkEquipmentAccessReturnsFalseWhenEquipmentMissing() {
        when(equipmentRepositoryPort.findById(30L)).thenReturn(Optional.empty());

        assertThat(accessCheckerService.checkEquipmentAccess(2L, 30L)).isFalse();
    }

    @Test
    void checkInspectionAccessReturnsTrueWhenZoneAccessExists() {
        when(loadInspectionPort.loadInspection(40L)).thenReturn(Optional.of(inspection(40L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkInspectionAccess(2L, 40L)).isTrue();
    }

    @Test
    void checkImageAccessReturnsTrueWhenInspectionAccessExists() {
        when(loadImagePort.loadImage(50L)).thenReturn(Optional.of(image(50L, 40L)));
        when(loadInspectionPort.loadInspection(40L)).thenReturn(Optional.of(inspection(40L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkImageAccess(2L, 50L)).isTrue();
    }

    @Test
    void checkImagePairAccessReturnsTrueWhenInspectionAccessExists() {
        when(loadImagePairPort.loadImagePair(60L)).thenReturn(Optional.of(imagePair(60L, 40L)));
        when(loadInspectionPort.loadInspection(40L)).thenReturn(Optional.of(inspection(40L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkImagePairAccess(2L, 60L)).isTrue();
    }

    @Test
    void checkAnalysisJobAccessReturnsTrueViaImagePath() {
        when(loadAnalysisJobPort.loadAnalysisJob(70L)).thenReturn(Optional.of(analysisJobByImage(70L, 50L)));
        when(loadImagePort.loadImage(50L)).thenReturn(Optional.of(image(50L, 40L)));
        when(loadInspectionPort.loadInspection(40L)).thenReturn(Optional.of(inspection(40L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkAnalysisJobAccess(2L, 70L)).isTrue();
    }

    @Test
    void checkAnalysisJobAccessReturnsTrueViaImagePairPath() {
        when(loadAnalysisJobPort.loadAnalysisJob(71L)).thenReturn(Optional.of(analysisJobByImagePair(71L, 60L)));
        when(loadImagePairPort.loadImagePair(60L)).thenReturn(Optional.of(imagePair(60L, 40L)));
        when(loadInspectionPort.loadInspection(40L)).thenReturn(Optional.of(inspection(40L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkAnalysisJobAccess(2L, 71L)).isTrue();
    }

    @Test
    void checkResultAccessReturnsTrueViaAnalysisJob() {
        when(loadAnalysisResultPort.loadAnalysisResult(80L)).thenReturn(Optional.of(result(80L, 70L)));
        when(loadAnalysisJobPort.loadAnalysisJob(70L)).thenReturn(Optional.of(analysisJobByImage(70L, 50L)));
        when(loadImagePort.loadImage(50L)).thenReturn(Optional.of(image(50L, 40L)));
        when(loadInspectionPort.loadInspection(40L)).thenReturn(Optional.of(inspection(40L, 20L)));
        when(zoneRepositoryPort.findById(20L)).thenReturn(Optional.of(zone(20L, 10L)));
        when(userRepositoryPort.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.USER, AccountStatus.APPROVED)));
        when(plantRepositoryPort.findById(10L)).thenReturn(Optional.of(plant(10L)));
        when(plantMemberRepositoryPort.existsActiveByPlantIdAndUserId(10L, 2L)).thenReturn(true);

        assertThat(accessCheckerService.checkResultAccess(2L, 80L)).isTrue();
    }

    @Test
    void checkAnalysisJobAccessReturnsFalseWhenPortBeanMissing() {
        AccessCheckerService serviceWithoutAnalysisPort = new AccessCheckerService(
                userRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                zoneRepositoryPort,
                equipmentRepositoryPort,
                loadInspectionPort,
                loadImagePort,
                loadImagePairPort,
                Optional.empty(),
                Optional.of(loadAnalysisResultPort)
        );

        assertThat(serviceWithoutAnalysisPort.checkAnalysisJobAccess(2L, 70L)).isFalse();
    }

    @Test
    void checkResultAccessReturnsFalseWhenPortBeanMissing() {
        AccessCheckerService serviceWithoutResultPort = new AccessCheckerService(
                userRepositoryPort,
                plantRepositoryPort,
                plantMemberRepositoryPort,
                zoneRepositoryPort,
                equipmentRepositoryPort,
                loadInspectionPort,
                loadImagePort,
                loadImagePairPort,
                Optional.of(loadAnalysisJobPort),
                Optional.empty()
        );

        assertThat(serviceWithoutResultPort.checkResultAccess(2L, 80L)).isFalse();
    }

    private User user(Long id, UserRole role, AccountStatus status) {
        OffsetDateTime now = now();
        return new User(
                id,
                "user" + id + "@example.com",
                "User " + id,
                "GOOGLE",
                "google-" + id,
                role,
                status,
                now.minusDays(1),
                now.minusDays(10),
                now.minusDays(1)
        );
    }

    private Plant plant(Long id) {
        OffsetDateTime now = now();
        return new Plant(id, "Plant-A", "Seoul", "desc", ResourceStatus.ACTIVE, 1L, now.minusDays(5), now.minusDays(1));
    }

    private Zone zone(Long id, Long plantId) {
        OffsetDateTime now = now();
        return new Zone(id, plantId, "Zone-A", "North", "desc", ResourceStatus.ACTIVE, 1L, now.minusDays(5), now.minusDays(1));
    }

    private Equipment equipment(Long id, Long zoneId) {
        OffsetDateTime now = now();
        return new Equipment(id, zoneId, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE, 1L, now.minusDays(5), now.minusDays(1));
    }

    private Inspection inspection(Long id, Long zoneId) {
        OffsetDateTime now = now();
        return new Inspection(id, zoneId, "Inspection-01", now.minusDays(1), CaptureMethod.DRONE, "Kim", "memo", InspectionStatus.READY, 1L, now.minusDays(5), now.minusDays(1));
    }

    private InspectionImage image(Long id, Long inspectionId) {
        OffsetDateTime now = now();
        return new InspectionImage(id, inspectionId, 30L, TargetType.PANEL, ImageType.RGB, "image.jpg", "image/jpeg", 10L,
                "bucket", "object", "url", now.minusDays(1), UploadStatus.UPLOADED, ResourceStatus.ACTIVE, 1L, now.minusDays(5), now.minusDays(1));
    }

    private ImagePair imagePair(Long id, Long inspectionId) {
        OffsetDateTime now = now();
        return new ImagePair(id, inspectionId, 30L, TargetType.PANEL, 50L, 51L, ResourceStatus.ACTIVE, 1L, now.minusDays(5), now.minusDays(1));
    }

    private AnalysisJob analysisJobByImage(Long id, Long imageId) {
        OffsetDateTime now = now();
        return new AnalysisJob(id, imageId, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.EARLY_FUSION, AnalysisModelType.FUSION,
                AnalysisJobStatus.QUEUED, 1L, now.minusDays(1), null, null, null, null, now.minusDays(5), now.minusDays(1));
    }

    private AnalysisJob analysisJobByImagePair(Long id, Long imagePairId) {
        OffsetDateTime now = now();
        return new AnalysisJob(id, null, imagePairId, AnalysisInputType.RGB_THERMAL_PAIR, RequestedModelType.EARLY_FUSION, AnalysisModelType.FUSION,
                AnalysisJobStatus.QUEUED, 1L, now.minusDays(1), null, null, null, null, now.minusDays(5), now.minusDays(1));
    }

    private AnalysisResult result(Long id, Long analysisJobId) {
        OffsetDateTime now = now();
        return new AnalysisResult(id, analysisJobId, AnalysisModelType.FUSION, "model", "v1", "onnx", "ort", 640,
                BigDecimal.valueOf(0.5), AnalysisResultStatus.ANOMALY, 1, BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.1),
                BigDecimal.valueOf(0.7), SeverityLevel.HIGH, com.pvfusion.domain.result.ActionCandidate.FIELD_INSPECTION,
                PriorityLevel.HIGH, ReviewStatus.UNCHECKED, null, null, null, null, null, null, null, null, null,
                now.minusDays(1), now.minusDays(5), now.minusDays(1));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
