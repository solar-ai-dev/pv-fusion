package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.image.GetImageQuery;
import com.pvfusion.application.dto.image.ImageResponse;

public interface GetImageUseCase {

    ImageResponse execute(GetImageQuery query);
}
