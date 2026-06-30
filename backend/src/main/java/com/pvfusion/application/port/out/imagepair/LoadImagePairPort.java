package com.pvfusion.application.port.out.imagepair;

import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.imagepair.ImagePair;
import java.util.List;
import java.util.Optional;

public interface LoadImagePairPort {

    Optional<ImagePair> loadImagePair(Long imagePairId);

    List<ImagePair> loadImagePairs(ImagePairCandidateQuery query);

    Optional<ImagePair> loadImagePair(Long rgbImageId, Long thermalImageId);

    Optional<ImagePair> loadActiveImagePair(Long inspectionId, TargetType targetType, Long equipmentId);

    List<ImagePair> loadImagePairsByStatus(Long inspectionId, ResourceStatus status);
}
