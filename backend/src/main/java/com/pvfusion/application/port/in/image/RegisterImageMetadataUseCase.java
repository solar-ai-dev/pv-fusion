package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.image.ImageResponse;
import com.pvfusion.application.dto.image.RegisterImageMetadataCommand;

public interface RegisterImageMetadataUseCase {

    ImageResponse execute(RegisterImageMetadataCommand command);
}
