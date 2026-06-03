package com.pvfusion.domain.image;

import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import java.time.OffsetDateTime;
import lombok.Getter;

@Getter
public class InspectionImage {

    private final Long id;
    private final Long inspectionId;
    private final Long equipmentId;
    private final TargetType targetType;
    private final ImageType imageType;
    private final String originalFilename;
    private final String mimeType;
    private final Long fileSize;
    private final String bucketName;
    private final String objectKey;
    private final String fileUrl;
    private final OffsetDateTime capturedAt;
    private final UploadStatus uploadStatus;
    private final ResourceStatus status;
    private final Long uploadedByUserId;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public InspectionImage(
            Long id,
            Long inspectionId,
            Long equipmentId,
            TargetType targetType,
            ImageType imageType,
            String originalFilename,
            String mimeType,
            Long fileSize,
            String bucketName,
            String objectKey,
            String fileUrl,
            OffsetDateTime capturedAt,
            UploadStatus uploadStatus,
            ResourceStatus status,
            Long uploadedByUserId,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.inspectionId = inspectionId;
        this.equipmentId = equipmentId;
        this.targetType = targetType;
        this.imageType = imageType;
        this.originalFilename = originalFilename;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.bucketName = bucketName;
        this.objectKey = objectKey;
        this.fileUrl = fileUrl;
        this.capturedAt = capturedAt;
        this.uploadStatus = uploadStatus;
        this.status = status;
        this.uploadedByUserId = uploadedByUserId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
