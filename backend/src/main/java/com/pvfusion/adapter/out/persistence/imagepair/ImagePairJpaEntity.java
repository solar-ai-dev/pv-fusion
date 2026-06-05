package com.pvfusion.adapter.out.persistence.imagepair;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "image_pairs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ImagePairJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long inspectionId;

    private Long equipmentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TargetType targetType;

    @Column(nullable = false)
    private Long rgbImageId;

    @Column(nullable = false)
    private Long thermalImageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ResourceStatus status;

    @Column(nullable = false)
    private Long createdByUserId;

    public ImagePairJpaEntity(
            Long id,
            Long inspectionId,
            Long equipmentId,
            TargetType targetType,
            Long rgbImageId,
            Long thermalImageId,
            ResourceStatus status,
            Long createdByUserId
    ) {
        this.id = id;
        this.inspectionId = inspectionId;
        this.equipmentId = equipmentId;
        this.targetType = targetType;
        this.rgbImageId = rgbImageId;
        this.thermalImageId = thermalImageId;
        this.status = status;
        this.createdByUserId = createdByUserId;
    }
}
