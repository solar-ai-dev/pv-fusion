package com.pvfusion.application.port.out.image;

import com.pvfusion.application.dto.image.ImageAccessUrlRequest;
import com.pvfusion.application.dto.image.ImageAccessUrlResult;

public interface GenerateImageAccessUrlPort {

    ImageAccessUrlResult generate(ImageAccessUrlRequest request);
}
