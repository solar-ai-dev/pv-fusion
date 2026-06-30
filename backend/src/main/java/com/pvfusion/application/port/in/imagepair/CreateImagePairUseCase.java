package com.pvfusion.application.port.in.imagepair;

import com.pvfusion.application.dto.imagepair.CreateImagePairCommand;
import com.pvfusion.application.dto.imagepair.ImagePairResponse;

public interface CreateImagePairUseCase {

    ImagePairResponse execute(CreateImagePairCommand command);
}
