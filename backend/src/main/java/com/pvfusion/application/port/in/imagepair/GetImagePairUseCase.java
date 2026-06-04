package com.pvfusion.application.port.in.imagepair;

import com.pvfusion.application.dto.imagepair.GetImagePairQuery;
import com.pvfusion.application.dto.imagepair.ImagePairResponse;

public interface GetImagePairUseCase {

    ImagePairResponse execute(GetImagePairQuery query);
}
