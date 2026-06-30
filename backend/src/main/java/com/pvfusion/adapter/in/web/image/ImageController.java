package com.pvfusion.adapter.in.web.image;

import com.pvfusion.application.dto.image.DeactivateImageCommand;
import com.pvfusion.application.dto.image.GetImagePreviewQuery;
import com.pvfusion.application.dto.image.GetImageQuery;
import com.pvfusion.application.dto.image.ImageListQuery;
import com.pvfusion.application.dto.image.ImagePreviewResponse;
import com.pvfusion.application.dto.image.ImageResponse;
import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.dto.image.UploadImageCommand;
import com.pvfusion.application.port.in.image.DeactivateImageUseCase;
import com.pvfusion.application.port.in.image.GetImagePreviewUseCase;
import com.pvfusion.application.port.in.image.GetImageUseCase;
import com.pvfusion.application.port.in.image.QueryImageUseCase;
import com.pvfusion.application.port.in.image.UploadImageUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
public class ImageController {

    private final UploadImageUseCase uploadImageUseCase;
    private final QueryImageUseCase queryImageUseCase;
    private final GetImageUseCase getImageUseCase;
    private final GetImagePreviewUseCase getImagePreviewUseCase;
    private final DeactivateImageUseCase deactivateImageUseCase;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImageResponse>> uploadImage(
            @Valid @ModelAttribute UploadImageRequest request,
            @RequestPart("file") MultipartFile file
    ) {
        try {
            ImageResponse response = uploadImageUseCase.execute(new UploadImageCommand(
                    request.getInspectionId(),
                    request.getEquipmentId(),
                    request.getTargetType(),
                    request.getImageType(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    request.getCapturedAt(),
                    request.getMemo(),
                    file.getOriginalFilename(),
                    file.getBytes()
            ));

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
        } catch (IOException exception) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED, "Failed to read uploaded file.");
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ImageSummaryResponse>>> queryImages(
            @RequestParam(required = false) Long plantId,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long inspectionId,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) ImageType imageType,
            @RequestParam(required = false) TargetType targetType,
            @RequestParam(required = false) ResourceStatus status
    ) {
        List<ImageSummaryResponse> response = queryImageUseCase.execute(new ImageListQuery(
                plantId,
                zoneId,
                inspectionId,
                equipmentId,
                imageType,
                targetType,
                status
        ));

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{imageId}")
    public ResponseEntity<ApiResponse<ImageResponse>> getImage(
            @PathVariable Long imageId
    ) {
        ImageResponse response = getImageUseCase.execute(new GetImageQuery(imageId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{imageId}/preview")
    public ResponseEntity<ApiResponse<ImagePreviewResponse>> getImagePreview(
            @PathVariable Long imageId,
            @RequestParam(required = false) String mode
    ) {
        ImagePreviewResponse response = getImagePreviewUseCase.execute(
                new GetImagePreviewQuery(imageId, mode)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{imageId}/deactivate")
    public ResponseEntity<ApiResponse<ImageResponse>> deactivateImage(
            @PathVariable Long imageId
    ) {
        ImageResponse response = deactivateImageUseCase.execute(new DeactivateImageCommand(imageId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
