package com.pvfusion.application.port.out.image;

import com.pvfusion.domain.image.InspectionImage;

public interface SaveImagePort {

    InspectionImage saveImage(InspectionImage inspectionImage);
}
