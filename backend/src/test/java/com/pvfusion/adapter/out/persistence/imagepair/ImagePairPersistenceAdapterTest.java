package com.pvfusion.adapter.out.persistence.imagepair;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.imagepair.ImagePair;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ImagePairPersistenceAdapterTest {

    @Mock
    private ImagePairJpaRepository imagePairJpaRepository;

    private ImagePairPersistenceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new ImagePairPersistenceAdapter(imagePairJpaRepository);
    }

    @Test
    void loadImagePairMapsEntityToDomain() {
        ImagePairJpaEntity entity = new ImagePairJpaEntity(1L, 10L, null, TargetType.ZONE, 100L, 101L, ResourceStatus.ACTIVE, 1L);

        when(imagePairJpaRepository.findById(1L)).thenReturn(Optional.of(entity));

        Optional<ImagePair> result = adapter.loadImagePair(1L);

        assertThat(result).isPresent();
        assertThat(result.get().getInspectionId()).isEqualTo(10L);
    }

    @Test
    void loadImagePairsUsesRepositorySearch() {
        ImagePairJpaEntity entity = new ImagePairJpaEntity(1L, 10L, 200L, TargetType.PANEL, 100L, 101L, ResourceStatus.ACTIVE, 1L);
        ImagePairCandidateQuery query = new ImagePairCandidateQuery(1L, 10L, TargetType.PANEL, 200L);

        when(imagePairJpaRepository.search(any(), any(), any())).thenReturn(List.of(entity));

        List<ImagePair> result = adapter.loadImagePairs(query);

        verify(imagePairJpaRepository).search(any(), any(), any());
        assertThat(result).hasSize(1);
    }
}
