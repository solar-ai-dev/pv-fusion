package com.pvfusion.application.port.out.image;

import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.domain.image.InspectionImage;
import java.util.List;
import java.util.Optional;

public interface LoadImagePort {

    Optional<InspectionImage> loadImage(Long imageId);

    List<InspectionImage> loadImages(ImageListQuery query);
}
