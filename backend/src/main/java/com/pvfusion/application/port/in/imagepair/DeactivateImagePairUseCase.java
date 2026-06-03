package com.pvfusion.application.port.in.imagepair;

import com.pvfusion.application.dto.imagepair.DeactivateImagePairCommand;
import com.pvfusion.application.dto.imagepair.ImagePairResponse;

public interface DeactivateImagePairUseCase {

    ImagePairResponse execute(DeactivateImagePairCommand command);
}
