package com.pvfusion.adapter.in.web.image;

import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

@Getter
@Setter
public class UploadImageRequest {

    @NotNull
    private Long inspectionId;

    private Long equipmentId;

    @NotNull
    private TargetType targetType;

    @NotNull
    private ImageType imageType;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private OffsetDateTime capturedAt;

    private String memo;
}
