package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.application.dto.image.ImageSummaryResponse;
import java.util.List;

public interface QueryImageUseCase {

    List<ImageSummaryResponse> execute(ImageListQuery query);
}
