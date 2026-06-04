package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.image.ImageResponse;
import com.pvfusion.application.dto.image.UploadImageCommand;

public interface UploadImageUseCase {

    ImageResponse execute(UploadImageCommand command);
}
