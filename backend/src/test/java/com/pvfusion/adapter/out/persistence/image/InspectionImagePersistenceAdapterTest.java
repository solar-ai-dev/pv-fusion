package com.pvfusion.adapter.out.persistence.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.image.UploadStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InspectionImagePersistenceAdapterTest {

    @Mock
    private InspectionImageJpaRepository inspectionImageJpaRepository;

    private InspectionImagePersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new InspectionImagePersistenceAdapter(inspectionImageJpaRepository);
    }

    @Test
    void loadImageMapsEntityToDomain() {
        InspectionImageJpaEntity entity = new InspectionImageJpaEntity(
                1L, 10L, null, TargetType.ZONE, ImageType.RGB, "rgb.jpg", "image/jpeg", 100L,
                "bucket", "object-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, ResourceStatus.ACTIVE, 1L
        );

        when(inspectionImageJpaRepository.findById(1L)).thenReturn(Optional.of(entity));

        Optional<InspectionImage> result = adapter.loadImage(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getInspectionId()).isEqualTo(10L);
    }

    @Test
    void loadImagesUsesRepositorySearch() {
        InspectionImageJpaEntity entity = new InspectionImageJpaEntity(
                1L, 10L, null, TargetType.ZONE, ImageType.RGB, "rgb.jpg", "image/jpeg", 100L,
                "bucket", "object-key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, ResourceStatus.ACTIVE, 1L
        );
        ImageListQuery query = new ImageListQuery(1L, null, 20L, 10L, null, ImageType.RGB, TargetType.ZONE, ResourceStatus.ACTIVE);

        when(inspectionImageJpaRepository.search(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(entity));

        List<InspectionImage> result = adapter.loadImages(query);

        verify(inspectionImageJpaRepository).search(any(), any(), any(), any(), any(), any(), any());
        assertThat(result).hasSize(1);
    }
}
