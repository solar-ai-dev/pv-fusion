package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.image.DeactivateImageCommand;
import com.pvfusion.application.dto.image.ImageResponse;

public interface DeactivateImageUseCase {

    ImageResponse execute(DeactivateImageCommand command);
}
