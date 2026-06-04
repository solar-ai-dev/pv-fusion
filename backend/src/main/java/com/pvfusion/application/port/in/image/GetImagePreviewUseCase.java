package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.image.GetImagePreviewQuery;
import com.pvfusion.application.dto.image.ImagePreviewResponse;

public interface GetImagePreviewUseCase {

    ImagePreviewResponse execute(GetImagePreviewQuery query);
}
