package com.pvfusion.application.port.in.imagepair;

import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateResponse;

public interface QueryImagePairCandidateUseCase {

    ImagePairCandidateResponse execute(ImagePairCandidateQuery query);
}
