package com.pvfusion.adapter.out.persistence.image;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.UploadStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "inspection_images")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InspectionImageJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long inspectionId;

    private Long equipmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TargetType targetType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ImageType imageType;

    @Column(nullable = false, length = 255)
    private String originalFilename;

    @Column(nullable = false, length = 100)
    private String mimeType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false, length = 255)
    private String bucketName;

    @Column(nullable = false, length = 1024)
    private String objectKey;

    @Column(length = 1024)
    private String fileUrl;

    private OffsetDateTime capturedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UploadStatus uploadStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResourceStatus status;

    @Column(nullable = false)
    private Long uploadedByUserId;

    public InspectionImageJpaEntity(
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
            Long uploadedByUserId
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
    }
}
