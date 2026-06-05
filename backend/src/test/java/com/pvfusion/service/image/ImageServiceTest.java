package com.pvfusion.service.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.image.GetImagePreviewQuery;
import com.pvfusion.application.dto.image.ImageAccessUrlResult;
import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.application.dto.image.ImageStorageResult;
import com.pvfusion.application.dto.image.UploadImageCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.equipment.LoadEquipmentPort;
import com.pvfusion.application.port.out.image.GenerateImageAccessUrlPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.image.SaveImagePort;
import com.pvfusion.application.port.out.image.StoreImageFilePort;
import com.pvfusion.application.port.out.image.UpdateImagePort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.equipment.Equipment;
import com.pvfusion.domain.equipment.EquipmentType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.image.UploadStatus;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ImageServiceTest {

    @Mock
    private LoadImagePort loadImagePort;
    @Mock
    private SaveImagePort saveImagePort;
    @Mock
    private UpdateImagePort updateImagePort;
    @Mock
    private StoreImageFilePort storeImageFilePort;
    @Mock
    private GenerateImageAccessUrlPort generateImageAccessUrlPort;
    @Mock
    private LoadInspectionPort loadInspectionPort;
    @Mock
    private LoadEquipmentPort loadEquipmentPort;
    @Mock
    private AccessChecker accessChecker;

    private ImageService imageService;

    @BeforeEach
    void setUp() {
        imageService = new ImageService(
                loadImagePort,
                saveImagePort,
                updateImagePort,
                storeImageFilePort,
                generateImageAccessUrlPort,
                loadInspectionPort,
                accessChecker,
                loadEquipmentPort,
                Optional.empty()
        );
    }

    @Test
    void uploadImageStoresMetadataUsingInspectionId() {
        UploadImageCommand command = new UploadImageCommand(
                1L,
                10L,
                null,
                TargetType.ZONE,
                ImageType.RGB,
                "panel.jpg",
                "image/jpeg",
                3L,
                OffsetDateTime.parse("2026-06-05T09:00:00+09:00"),
                null,
                "panel.jpg",
                new byte[]{1, 2, 3}
        );
        Inspection inspection = new Inspection(
                10L, 20L, "Inspection", null, CaptureMethod.DRONE, null, null,
                null, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
        InspectionImage saved = new InspectionImage(
                30L, 10L, null, TargetType.ZONE, ImageType.RGB, "panel.jpg", "image/jpeg", 3L,
                "bucket", "object-key", null, command.capturedAt(), UploadStatus.UPLOADED, ResourceStatus.ACTIVE,
                1L, OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);
        when(loadImagePort.loadImage(10L, TargetType.ZONE, null, ImageType.RGB, ResourceStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(storeImageFilePort.store(any())).thenReturn(new ImageStorageResult("bucket", "object-key", null));
        when(saveImagePort.saveImage(any())).thenReturn(saved);

        var response = imageService.execute(command);

        ArgumentCaptor<InspectionImage> captor = ArgumentCaptor.forClass(InspectionImage.class);
        verify(storeImageFilePort).store(any());
        verify(saveImagePort).saveImage(captor.capture());
        assertThat(captor.getValue().getInspectionId()).isEqualTo(10L);
        assertThat(response.inspectionId()).isEqualTo(10L);
        assertThat(response.zoneId()).isEqualTo(20L);
    }

    @Test
    void uploadImageRequiresEquipmentIdForNonZoneTarget() {
        UploadImageCommand command = new UploadImageCommand(
                1L,
                10L,
                null,
                TargetType.PANEL,
                ImageType.RGB,
                "panel.jpg",
                "image/jpeg",
                3L,
                OffsetDateTime.now(),
                null,
                "panel.jpg",
                new byte[]{1, 2, 3}
        );
        Inspection inspection = new Inspection(
                10L, 20L, "Inspection", null, CaptureMethod.DRONE, null, null,
                null, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> imageService.execute(command))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void uploadImageLoadsEquipmentForNonZoneTarget() {
        UploadImageCommand command = new UploadImageCommand(
                1L,
                10L,
                200L,
                TargetType.PANEL,
                ImageType.RGB,
                "panel.jpg",
                "image/jpeg",
                3L,
                OffsetDateTime.parse("2026-06-05T09:00:00+09:00"),
                null,
                "panel.jpg",
                new byte[]{1, 2, 3}
        );
        Inspection inspection = new Inspection(
                10L, 20L, "Inspection", null, CaptureMethod.DRONE, null, null,
                null, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
        Equipment equipment = new Equipment(
                200L, 20L, null, EquipmentType.PANEL, "Panel-1", null,
                ResourceStatus.ACTIVE, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
        InspectionImage saved = new InspectionImage(
                30L, 10L, 200L, TargetType.PANEL, ImageType.RGB, "panel.jpg", "image/jpeg", 3L,
                "bucket", "object-key", null, command.capturedAt(), UploadStatus.UPLOADED, ResourceStatus.ACTIVE,
                1L, OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);
        when(loadEquipmentPort.loadEquipment(200L)).thenReturn(Optional.of(equipment));
        when(loadImagePort.loadImage(10L, TargetType.PANEL, 200L, ImageType.RGB, ResourceStatus.ACTIVE))
                .thenReturn(Optional.empty());
        when(storeImageFilePort.store(any())).thenReturn(new ImageStorageResult("bucket", "object-key", null));
        when(saveImagePort.saveImage(any())).thenReturn(saved);

        var response = imageService.execute(command);

        verify(loadEquipmentPort).loadEquipment(200L);
        assertThat(response.equipmentId()).isEqualTo(200L);
    }

    @Test
    void uploadImageFailsWhenEquipmentDoesNotExist() {
        UploadImageCommand command = new UploadImageCommand(
                1L,
                10L,
                200L,
                TargetType.PANEL,
                ImageType.RGB,
                "panel.jpg",
                "image/jpeg",
                3L,
                OffsetDateTime.now(),
                null,
                "panel.jpg",
                new byte[]{1, 2, 3}
        );
        Inspection inspection = new Inspection(
                10L, 20L, "Inspection", null, CaptureMethod.DRONE, null, null,
                null, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);
        when(loadEquipmentPort.loadEquipment(200L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> imageService.execute(command))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NOT_FOUND);
    }

    @Test
    void uploadImageFailsWhenDuplicateExists() {
        UploadImageCommand command = new UploadImageCommand(
                1L,
                10L,
                null,
                TargetType.ZONE,
                ImageType.RGB,
                "panel.jpg",
                "image/jpeg",
                3L,
                OffsetDateTime.now(),
                null,
                "panel.jpg",
                new byte[]{1, 2, 3}
        );
        Inspection inspection = new Inspection(
                10L, 20L, "Inspection", null, CaptureMethod.DRONE, null, null,
                null, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
        InspectionImage existing = new InspectionImage(
                31L, 10L, null, TargetType.ZONE, ImageType.RGB, "existing.jpg", "image/jpeg", 10L,
                "bucket", "object-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, ResourceStatus.ACTIVE,
                1L, OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(loadInspectionPort.loadInspection(10L)).thenReturn(Optional.of(inspection));
        when(accessChecker.checkInspectionAccess(1L, 10L)).thenReturn(true);
        when(loadImagePort.loadImage(10L, TargetType.ZONE, null, ImageType.RGB, ResourceStatus.ACTIVE))
                .thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> imageService.execute(command))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_IMAGE_UPLOAD);
    }

    @Test
    void queryImagesRequiresScopedFilterForNonAdmin() {
        ImageListQuery query = new ImageListQuery(1L, null, null, null, null, null, null, null);

        when(accessChecker.isAdmin(1L)).thenReturn(false);

        assertThatThrownBy(() -> imageService.execute(query))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void getImagePreviewGeneratesAccessUrl() {
        InspectionImage image = new InspectionImage(
                30L, 10L, null, TargetType.ZONE, ImageType.RGB, "panel.jpg", "image/jpeg", 3L,
                "bucket", "object-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, ResourceStatus.ACTIVE,
                1L, OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(accessChecker.checkImageAccess(1L, 30L)).thenReturn(true);
        when(loadImagePort.loadImage(30L)).thenReturn(Optional.of(image));
        when(generateImageAccessUrlPort.generate(any())).thenReturn(new ImageAccessUrlResult(
                "https://example.com/image",
                OffsetDateTime.parse("2026-06-05T10:00:00Z")
        ));

        var response = imageService.execute(new GetImagePreviewQuery(1L, 30L, null));

        verify(generateImageAccessUrlPort).generate(any());
        assertThat(response.url()).isEqualTo("https://example.com/image");
    }
}
