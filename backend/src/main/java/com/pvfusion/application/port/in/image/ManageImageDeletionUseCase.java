package com.pvfusion.application.port.in.image;

import com.pvfusion.application.dto.deletion.DeleteImpactResponse;
import com.pvfusion.application.dto.deletion.DeleteResourceResponse;

public interface ManageImageDeletionUseCase {

    DeleteImpactResponse getImageDeleteImpact(Long imageId);

    DeleteResourceResponse deleteImage(Long imageId);
}
