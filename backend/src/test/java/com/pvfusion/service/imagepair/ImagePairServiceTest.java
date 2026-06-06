package com.pvfusion.service.imagepair;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.dto.imagepair.CreateImagePairCommand;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.equipment.LoadEquipmentPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.imagepair.SaveImagePairPort;
import com.pvfusion.application.port.out.imagepair.UpdateImagePairPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
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
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ImagePairServiceTest {

    @Mock
    private LoadImagePairPort loadImagePairPort;
    @Mock
    private SaveImagePairPort saveImagePairPort;
    @Mock
    private UpdateImagePairPort updateImagePairPort;
    @Mock
    private LoadImagePort loadImagePort;
    @Mock
    private LoadInspectionPort loadInspectionPort;
    @Mock
    private LoadEquipmentPort loadEquipmentPort;
    @Mock
    private AccessChecker accessChecker;
    @Mock
    private CurrentUserPort currentUserPort;

    private ImagePairService imagePairService;

    @BeforeEach
    void setUp() {
        imagePairService = new ImagePairService(
                loadImagePairPort,
                saveImagePairPort,
                updateImagePairPort,
                loadImagePort,
                loadInspectionPort,
                loadEquipmentPort,
                accessChecker,
                Optional.empty(),
                currentUserPort
        );
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
    }

    @Test
    void createImagePairSucceedsForSameInspectionAndTarget() {
        Inspection inspection = inspection();
        InspectionImage rgb = rgbImage(100L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        Equipment equipment = equipment(200L, 20L);
        ImagePair saved = new ImagePair(
                1L, 10L, 200L, TargetType.PANEL, 100L, 101L, ResourceStatus.ACTIVE, 1L,
                OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));
        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(loadEquipmentPort.loadEquipment(200L)).thenReturn(Optional.of(equipment));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);
        when(loadImagePairPort.loadImagePair(100L, 101L)).thenReturn(Optional.empty());
        when(loadImagePairPort.loadActiveImagePair(10L, TargetType.PANEL, 200L)).thenReturn(Optional.empty());
        when(saveImagePairPort.saveImagePair(any())).thenReturn(saved);

        var response = imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L));

        ArgumentCaptor<ImagePair> captor = ArgumentCaptor.forClass(ImagePair.class);
        verify(saveImagePairPort).saveImagePair(captor.capture());
        assertThat(captor.getValue().getInspectionId()).isEqualTo(10L);
        assertThat(response.rgbImageId()).isEqualTo(100L);
        assertThat(response.thermalImageId()).isEqualTo(101L);
    }

    @Test
    void createImagePairFailsWhenInspectionDiffers() {
        InspectionImage rgb = rgbImage(100L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 11L, null, TargetType.ZONE, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_CONDITION_MISMATCH);
    }

    @Test
    void createImagePairFailsWhenTargetTypeDiffers() {
        InspectionImage rgb = rgbImage(100L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, null, TargetType.PANEL, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_CONDITION_MISMATCH);
    }

    @Test
    void createImagePairFailsWhenEquipmentDiffers() {
        InspectionImage rgb = rgbImage(100L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, 201L, TargetType.PANEL, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_CONDITION_MISMATCH);
    }

    @Test
    void createImagePairFailsWhenImageTypeIsNotRgbAndThermal() {
        InspectionImage rgb = thermalImage(100L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_CONDITION_MISMATCH);
    }

    @Test
    void createImagePairFailsWhenImageIsInactive() {
        InspectionImage rgb = rgbImage(100L, 10L, null, TargetType.ZONE, ResourceStatus.INACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_CONDITION_MISMATCH);
    }

    @Test
    void createImagePairFailsWhenDuplicatePairExists() {
        Inspection inspection = inspection();
        InspectionImage rgb = rgbImage(100L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        ImagePair duplicate = new ImagePair(5L, 10L, null, TargetType.ZONE, 100L, 101L, ResourceStatus.ACTIVE, 1L, null, null);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));
        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(loadImagePairPort.loadImagePair(100L, 101L)).thenReturn(Optional.of(duplicate));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_ALREADY_EXISTS);
    }

    @Test
    void createImagePairFailsWhenActivePairExistsForSameTarget() {
        Inspection inspection = inspection();
        InspectionImage rgb = rgbImage(100L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        InspectionImage thermal = thermalImage(101L, 10L, null, TargetType.ZONE, ResourceStatus.ACTIVE);
        ImagePair activePair = new ImagePair(5L, 10L, null, TargetType.ZONE, 90L, 91L, ResourceStatus.ACTIVE, 1L, null, null);

        when(loadImagePort.loadImage(100L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(101L)).thenReturn(Optional.of(thermal));
        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(loadImagePairPort.loadImagePair(100L, 101L)).thenReturn(Optional.empty());
        when(loadImagePairPort.loadActiveImagePair(10L, TargetType.ZONE, null)).thenReturn(Optional.of(activePair));

        assertThatThrownBy(() -> imagePairService.execute(new CreateImagePairCommand(1L, 100L, 101L)))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAIR_ALREADY_EXISTS);
    }

    @Test
    void candidateQueryGroupsRgbAndThermalByTargetAndEquipment() {
        Inspection inspection = inspection();
        ImagePair activePair = new ImagePair(5L, 10L, 200L, TargetType.PANEL, 100L, 101L, ResourceStatus.ACTIVE, 1L, null, null);
        InspectionImage rgbUsed = rgbImage(100L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        InspectionImage rgbFree = rgbImage(102L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        InspectionImage thermalUsed = thermalImage(101L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        InspectionImage thermalFree = thermalImage(103L, 10L, 200L, TargetType.PANEL, ResourceStatus.ACTIVE);
        Equipment equipment = equipment(200L, 20L);

        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);
        when(loadEquipmentPort.loadEquipment(200L)).thenReturn(Optional.of(equipment));
        when(loadImagePort.loadImages(any()))
                .thenReturn(List.of(rgbUsed, rgbFree))
                .thenReturn(List.of(thermalUsed, thermalFree));
        when(loadImagePairPort.loadImagePairsByStatus(10L, ResourceStatus.ACTIVE)).thenReturn(List.of(activePair));

        var response = imagePairService.execute(new ImagePairCandidateQuery(1L, 10L, TargetType.PANEL, 200L));

        assertThat(response.rgbCandidates()).extracting(ImageSummaryResponse::imageId).containsExactly(102L);
        assertThat(response.thermalCandidates()).extracting(ImageSummaryResponse::imageId).containsExactly(103L);
    }

    private Inspection inspection() {
        return new Inspection(10L, 20L, "Inspection", null, CaptureMethod.DRONE, null, null, null, 1L, null, null);
    }

    private Equipment equipment(Long equipmentId, Long zoneId) {
        return new Equipment(equipmentId, zoneId, null, EquipmentType.PANEL, "Panel", null, ResourceStatus.ACTIVE, 1L, null, null);
    }

    private InspectionImage rgbImage(Long imageId, Long inspectionId, Long equipmentId, TargetType targetType, ResourceStatus status) {
        return new InspectionImage(imageId, inspectionId, equipmentId, targetType, ImageType.RGB, "rgb.jpg", "image/jpeg", 10L,
                "bucket", "rgb-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, status, 1L, null, null);
    }

    private InspectionImage thermalImage(Long imageId, Long inspectionId, Long equipmentId, TargetType targetType, ResourceStatus status) {
        return new InspectionImage(imageId, inspectionId, equipmentId, targetType, ImageType.THERMAL, "thermal.jpg", "image/jpeg", 10L,
                "bucket", "thermal-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, status, 1L, null, null);
    }
}
