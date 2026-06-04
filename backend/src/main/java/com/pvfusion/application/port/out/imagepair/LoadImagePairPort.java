package com.pvfusion.application.port.out.imagepair;

import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.domain.imagepair.ImagePair;
import java.util.List;
import java.util.Optional;

public interface LoadImagePairPort {

    Optional<ImagePair> loadImagePair(Long imagePairId);

    List<ImagePair> loadImagePairs(ImagePairCandidateQuery query);
}
