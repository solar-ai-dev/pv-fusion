package com.pvfusion.adapter.out.persistence.operation;

import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;

public interface OperationLogJpaRepository extends JpaRepository<OperationLogJpaEntity, Long> {

    @Query(
            value = """
                    select o
                    from OperationLogJpaEntity o
                    where (:actorUserId is null or o.actorUserId = :actorUserId)
                      and (:eventCategory is null or o.eventCategory = :eventCategory)
                      and (:eventType is null or o.eventType = :eventType)
                      and (:plantId is null or o.plantId = :plantId)
                      and (:zoneId is null or o.zoneId = :zoneId)
                      and (:inspectionId is null or o.inspectionId = :inspectionId)
                      and (:imageId is null or o.imageId = :imageId)
                      and (:analysisJobId is null or o.analysisJobId = :analysisJobId)
                      and (:analysisResultId is null or o.analysisResultId = :analysisResultId)
                      and (:fromFilterEnabled = false or o.createdAt >= :from)
                      and (:toFilterEnabled = false or o.createdAt <= :to)
                      and (:keywordFilterEnabled = false
                          or lower(coalesce(o.message, '')) like :keywordPattern
                          or lower(coalesce(o.detail, '')) like :keywordPattern
                          or lower(coalesce(o.targetTable, '')) like :keywordPattern)
                    """,
            countQuery = """
                    select count(o)
                    from OperationLogJpaEntity o
                    where (:actorUserId is null or o.actorUserId = :actorUserId)
                      and (:eventCategory is null or o.eventCategory = :eventCategory)
                      and (:eventType is null or o.eventType = :eventType)
                      and (:plantId is null or o.plantId = :plantId)
                      and (:zoneId is null or o.zoneId = :zoneId)
                      and (:inspectionId is null or o.inspectionId = :inspectionId)
                      and (:imageId is null or o.imageId = :imageId)
                      and (:analysisJobId is null or o.analysisJobId = :analysisJobId)
                      and (:analysisResultId is null or o.analysisResultId = :analysisResultId)
                      and (:fromFilterEnabled = false or o.createdAt >= :from)
                      and (:toFilterEnabled = false or o.createdAt <= :to)
                      and (:keywordFilterEnabled = false
                          or lower(coalesce(o.message, '')) like :keywordPattern
                          or lower(coalesce(o.detail, '')) like :keywordPattern
                          or lower(coalesce(o.targetTable, '')) like :keywordPattern)
                    """
    )
    Page<OperationLogJpaEntity> search(
            @Param("actorUserId") Long actorUserId,
            @Param("eventCategory") OperationEventCategory eventCategory,
            @Param("eventType") OperationEventType eventType,
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionId") Long inspectionId,
            @Param("imageId") Long imageId,
            @Param("analysisJobId") Long analysisJobId,
            @Param("analysisResultId") Long analysisResultId,
            @Param("fromFilterEnabled") boolean fromFilterEnabled,
            @Param("from") OffsetDateTime from,
            @Param("toFilterEnabled") boolean toFilterEnabled,
            @Param("to") OffsetDateTime to,
            @Param("keywordFilterEnabled") boolean keywordFilterEnabled,
            @Param("keywordPattern") String keywordPattern,
            Pageable pageable
    );
}
