package com.pvfusion.application.port.in.imagepair;

import com.pvfusion.application.dto.imagepair.ImagePairResponse;
import com.pvfusion.application.dto.imagepair.UpdateImagePairCommand;

public interface UpdateImagePairUseCase {

    ImagePairResponse execute(UpdateImagePairCommand command);
}
