package com.pvfusion.adapter.in.web.imagepair;

import com.pvfusion.application.dto.imagepair.CreateImagePairCommand;
import com.pvfusion.application.dto.imagepair.DeactivateImagePairCommand;
import com.pvfusion.application.dto.imagepair.GetImagePairQuery;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateQuery;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateResponse;
import com.pvfusion.application.dto.imagepair.ImagePairResponse;
import com.pvfusion.application.dto.imagepair.UpdateImagePairCommand;
import com.pvfusion.application.port.in.imagepair.CreateImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.DeactivateImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.GetImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.QueryImagePairCandidateUseCase;
import com.pvfusion.application.port.in.imagepair.UpdateImagePairUseCase;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/image-pairs")
@RequiredArgsConstructor
public class ImagePairController {

    private final QueryImagePairCandidateUseCase queryImagePairCandidateUseCase;
    private final CreateImagePairUseCase createImagePairUseCase;
    private final GetImagePairUseCase getImagePairUseCase;
    private final UpdateImagePairUseCase updateImagePairUseCase;
    private final DeactivateImagePairUseCase deactivateImagePairUseCase;

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<ImagePairCandidateResponse>> getCandidates(
            @RequestParam Long inspectionId,
            @RequestParam TargetType targetType,
            @RequestParam(required = false) Long equipmentId
    ) {
        ImagePairCandidateResponse response = queryImagePairCandidateUseCase.execute(
                new ImagePairCandidateQuery(inspectionId, targetType, equipmentId)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ImagePairResponse>> createImagePair(
            @Valid @RequestBody CreateImagePairRequest request
    ) {
        ImagePairResponse response = createImagePairUseCase.execute(
                new CreateImagePairCommand(request.rgbImageId(), request.thermalImageId())
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/{imagePairId}")
    public ResponseEntity<ApiResponse<ImagePairResponse>> getImagePair(
            @PathVariable Long imagePairId
    ) {
        ImagePairResponse response = getImagePairUseCase.execute(new GetImagePairQuery(imagePairId));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{imagePairId}")
    public ResponseEntity<ApiResponse<ImagePairResponse>> updateImagePair(
            @PathVariable Long imagePairId,
            @Valid @RequestBody UpdateImagePairRequest request
    ) {
        ImagePairResponse response = updateImagePairUseCase.execute(
                new UpdateImagePairCommand(imagePairId, request.rgbImageId(), request.thermalImageId())
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{imagePairId}/deactivate")
    public ResponseEntity<ApiResponse<ImagePairResponse>> deactivateImagePair(
            @PathVariable Long imagePairId
    ) {
        ImagePairResponse response = deactivateImagePairUseCase.execute(
                new DeactivateImagePairCommand(imagePairId)
        );
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
