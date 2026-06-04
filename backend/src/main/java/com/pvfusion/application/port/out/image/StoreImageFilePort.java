package com.pvfusion.application.port.out.image;

import com.pvfusion.application.dto.image.ImageStorageRequest;
import com.pvfusion.application.dto.image.ImageStorageResult;

public interface StoreImageFilePort {

    ImageStorageResult store(ImageStorageRequest request);
}
