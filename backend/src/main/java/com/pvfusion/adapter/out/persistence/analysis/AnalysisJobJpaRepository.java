package com.pvfusion.adapter.out.persistence.analysis;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;

public interface AnalysisJobJpaRepository extends JpaRepository<AnalysisJobJpaEntity, Long> {

    @Query("""
            select aj
            from AnalysisJobJpaEntity aj
            where (:jobStatus is null or aj.jobStatus = :jobStatus)
              and (:inputType is null or aj.inputType = :inputType)
              and (:modelType is null or aj.modelType = :modelType)
              and (
                  (:plantId is null and :zoneId is null and :inspectionId is null)
                  or exists (
                      select 1
                      from InspectionImageJpaEntity ii, InspectionJpaEntity i, ZoneJpaEntity z
                      where ii.id = aj.imageId
                        and i.id = ii.inspectionId
                        and z.id = i.zoneId
                        and (:plantId is null or z.plantId = :plantId)
                        and (:zoneId is null or i.zoneId = :zoneId)
                        and (:inspectionId is null or i.id = :inspectionId)
                  )
                  or exists (
                      select 1
                      from ImagePairJpaEntity ip, InspectionJpaEntity i, ZoneJpaEntity z
                      where ip.id = aj.imagePairId
                        and i.id = ip.inspectionId
                        and z.id = i.zoneId
                        and (:plantId is null or z.plantId = :plantId)
                        and (:zoneId is null or i.zoneId = :zoneId)
                        and (:inspectionId is null or i.id = :inspectionId)
                  )
              )
            """)
    Page<AnalysisJobJpaEntity> search(
            @Param("plantId") Long plantId,
            @Param("zoneId") Long zoneId,
            @Param("inspectionId") Long inspectionId,
            @Param("jobStatus") AnalysisJobStatus jobStatus,
            @Param("inputType") AnalysisInputType inputType,
            @Param("modelType") AnalysisModelType modelType,
            Pageable pageable
    );

    List<AnalysisJobJpaEntity> findByImageIdAndJobStatusIn(Long imageId, List<String> statuses);

    List<AnalysisJobJpaEntity> findByImagePairIdAndJobStatusIn(Long imagePairId, List<String> statuses);
}
