package com.pvfusion.adapter.out.persistence.deletion;

import com.pvfusion.application.dto.deletion.DeleteImpactCounts;
import com.pvfusion.application.dto.deletion.DeletionPlan;
import com.pvfusion.application.dto.deletion.StoredFileReference;
import com.pvfusion.application.port.out.deletion.ResourceDeletionPort;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ResourceDeletionPersistenceAdapter implements ResourceDeletionPort {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    @Override
    public DeleteImpactCounts getPlantImpact(Long plantId) {
        ScopeIds scopeIds = loadPlantScope(plantId);
        return buildImpact(scopeIds, loadCount("SELECT COUNT(*) FROM plant_members WHERE plant_id = :plantId",
                new MapSqlParameterSource("plantId", plantId)));
    }

    @Override
    public DeleteImpactCounts getZoneImpact(Long zoneId) {
        return buildImpact(loadZoneScope(zoneId), 0L);
    }

    @Override
    public DeleteImpactCounts getInspectionImpact(Long inspectionId) {
        return buildImpact(loadInspectionScope(inspectionId), 0L);
    }

    @Override
    public DeleteImpactCounts getImageImpact(Long imageId) {
        return buildImpact(loadImageScope(imageId), 0L);
    }

    @Override
    public DeletionPlan deletePlant(Long plantId) {
        ScopeIds scopeIds = loadPlantScope(plantId);
        List<StoredFileReference> files = loadStoredFiles(scopeIds);

        deleteAnalysisCascade(scopeIds);
        update("DELETE FROM plant_members WHERE plant_id = :plantId", new MapSqlParameterSource("plantId", plantId));
        update("DELETE FROM operation_logs WHERE plant_id = :plantId", new MapSqlParameterSource("plantId", plantId));
        update("DELETE FROM equipments WHERE zone_id IN (:zoneIds)", params("zoneIds", scopeIds.zoneIds()));
        update("DELETE FROM zones WHERE id IN (:zoneIds)", params("zoneIds", scopeIds.zoneIds()));
        update("DELETE FROM plants WHERE id = :plantId", new MapSqlParameterSource("plantId", plantId));
        return new DeletionPlan(files);
    }

    @Override
    public DeletionPlan deleteZone(Long zoneId) {
        ScopeIds scopeIds = loadZoneScope(zoneId);
        List<StoredFileReference> files = loadStoredFiles(scopeIds);

        deleteAnalysisCascade(scopeIds);
        update("DELETE FROM operation_logs WHERE zone_id = :zoneId", new MapSqlParameterSource("zoneId", zoneId));
        update("DELETE FROM equipments WHERE zone_id = :zoneId", new MapSqlParameterSource("zoneId", zoneId));
        update("DELETE FROM zones WHERE id = :zoneId", new MapSqlParameterSource("zoneId", zoneId));
        return new DeletionPlan(files);
    }

    @Override
    public DeletionPlan deleteInspection(Long inspectionId) {
        ScopeIds scopeIds = loadInspectionScope(inspectionId);
        List<StoredFileReference> files = loadStoredFiles(scopeIds);

        deleteAnalysisCascade(scopeIds);
        update("DELETE FROM operation_logs WHERE inspection_id = :inspectionId",
                new MapSqlParameterSource("inspectionId", inspectionId));
        update("DELETE FROM inspections WHERE id = :inspectionId", new MapSqlParameterSource("inspectionId", inspectionId));
        return new DeletionPlan(files);
    }

    @Override
    public DeletionPlan deleteImage(Long imageId) {
        ScopeIds scopeIds = loadImageScope(imageId);
        List<StoredFileReference> files = loadStoredFiles(scopeIds);

        deleteAnalysisCascade(scopeIds);
        update("DELETE FROM operation_logs WHERE image_id = :imageId", new MapSqlParameterSource("imageId", imageId));
        update("DELETE FROM inspection_images WHERE id = :imageId", new MapSqlParameterSource("imageId", imageId));
        return new DeletionPlan(files);
    }

    private DeleteImpactCounts buildImpact(ScopeIds scopeIds, long plantMemberCount) {
        long detectedDefectCount = countIn("SELECT COUNT(*) FROM detected_defects WHERE analysis_result_id IN (:resultIds)",
                "resultIds", scopeIds.analysisResultIds());
        long reviewHistoryCount = countIn(
                "SELECT COUNT(*) FROM result_review_histories WHERE analysis_result_id IN (:resultIds)",
                "resultIds",
                scopeIds.analysisResultIds());
        long operationLogCount = countOperationLogs(scopeIds);
        long storageFileCount = loadStoredFiles(scopeIds).size();

        return new DeleteImpactCounts(
                plantMemberCount,
                scopeIds.zoneIds().size(),
                scopeIds.equipmentIds().size(),
                scopeIds.inspectionIds().size(),
                scopeIds.imageIds().size(),
                scopeIds.analysisJobIds().size(),
                scopeIds.analysisResultIds().size(),
                detectedDefectCount,
                reviewHistoryCount,
                operationLogCount,
                storageFileCount
        );
    }

    private void deleteAnalysisCascade(ScopeIds scopeIds) {
        deleteOperationLogs(scopeIds);
        update("DELETE FROM result_review_histories WHERE analysis_result_id IN (:resultIds)",
                params("resultIds", scopeIds.analysisResultIds()));
        update("DELETE FROM detected_defects WHERE analysis_result_id IN (:resultIds)",
                params("resultIds", scopeIds.analysisResultIds()));
        update("DELETE FROM analysis_results WHERE id IN (:resultIds)",
                params("resultIds", scopeIds.analysisResultIds()));
        update("DELETE FROM analysis_jobs WHERE id IN (:jobIds)", params("jobIds", scopeIds.analysisJobIds()));
        update("DELETE FROM inspection_images WHERE id IN (:imageIds)", params("imageIds", scopeIds.imageIds()));
        update("DELETE FROM inspections WHERE id IN (:inspectionIds)", params("inspectionIds", scopeIds.inspectionIds()));
    }

    private void deleteOperationLogs(ScopeIds scopeIds) {
        update("DELETE FROM operation_logs WHERE analysis_result_id IN (:resultIds)",
                params("resultIds", scopeIds.analysisResultIds()));
        update("DELETE FROM operation_logs WHERE analysis_job_id IN (:jobIds)", params("jobIds", scopeIds.analysisJobIds()));
        update("DELETE FROM operation_logs WHERE image_id IN (:imageIds)", params("imageIds", scopeIds.imageIds()));
        update("DELETE FROM operation_logs WHERE inspection_id IN (:inspectionIds)",
                params("inspectionIds", scopeIds.inspectionIds()));
    }

    private long countOperationLogs(ScopeIds scopeIds) {
        List<String> conditions = new ArrayList<>();
        MapSqlParameterSource parameters = new MapSqlParameterSource();

        if (scopeIds.plantId() != null) {
            conditions.add("plant_id = :plantId");
            parameters.addValue("plantId", scopeIds.plantId());
        }
        if (!scopeIds.zoneIds().isEmpty()) {
            conditions.add("zone_id IN (:zoneIds)");
            parameters.addValue("zoneIds", scopeIds.zoneIds());
        }
        if (!scopeIds.inspectionIds().isEmpty()) {
            conditions.add("inspection_id IN (:inspectionIds)");
            parameters.addValue("inspectionIds", scopeIds.inspectionIds());
        }
        if (!scopeIds.imageIds().isEmpty()) {
            conditions.add("image_id IN (:imageIds)");
            parameters.addValue("imageIds", scopeIds.imageIds());
        }
        if (!scopeIds.analysisJobIds().isEmpty()) {
            conditions.add("analysis_job_id IN (:jobIds)");
            parameters.addValue("jobIds", scopeIds.analysisJobIds());
        }
        if (!scopeIds.analysisResultIds().isEmpty()) {
            conditions.add("analysis_result_id IN (:resultIds)");
            parameters.addValue("resultIds", scopeIds.analysisResultIds());
        }

        if (conditions.isEmpty()) {
            return 0L;
        }

        return loadCount(
                "SELECT COUNT(DISTINCT id) FROM operation_logs WHERE " + String.join(" OR ", conditions),
                parameters
        );
    }

    private List<StoredFileReference> loadStoredFiles(ScopeIds scopeIds) {
        Set<StoredFileReference> files = new LinkedHashSet<>();

        if (!scopeIds.imageIds().isEmpty()) {
            files.addAll(queryFiles(
                    "SELECT bucket_name, object_key FROM inspection_images WHERE id IN (:imageIds) AND object_key IS NOT NULL",
                    params("imageIds", scopeIds.imageIds())
            ));
        }
        if (!scopeIds.analysisResultIds().isEmpty()) {
            files.addAll(queryFiles(
                    """
                            SELECT bbox_bucket_name AS bucket_name, bbox_object_key AS object_key
                            FROM analysis_results
                            WHERE id IN (:resultIds) AND bbox_object_key IS NOT NULL
                            UNION ALL
                            SELECT heatmap_bucket_name AS bucket_name, heatmap_object_key AS object_key
                            FROM analysis_results
                            WHERE id IN (:resultIds) AND heatmap_object_key IS NOT NULL
                            UNION ALL
                            SELECT mask_bucket_name AS bucket_name, mask_object_key AS object_key
                            FROM analysis_results
                            WHERE id IN (:resultIds) AND mask_object_key IS NOT NULL
                            """,
                    params("resultIds", scopeIds.analysisResultIds())
            ));
            files.addAll(queryFiles(
                    "SELECT mask_bucket_name AS bucket_name, mask_object_key AS object_key FROM detected_defects WHERE analysis_result_id IN (:resultIds) AND mask_object_key IS NOT NULL",
                    params("resultIds", scopeIds.analysisResultIds())
            ));
        }

        return List.copyOf(files);
    }

    private List<StoredFileReference> queryFiles(String sql, MapSqlParameterSource parameters) {
        return jdbcTemplate.query(
                sql,
                parameters,
                (resultSet, rowNum) -> new StoredFileReference(
                        resultSet.getString("bucket_name"),
                        resultSet.getString("object_key")
                )
        );
    }

    private ScopeIds loadPlantScope(Long plantId) {
        List<Long> zoneIds = queryIds("SELECT id FROM zones WHERE plant_id = :plantId", new MapSqlParameterSource("plantId", plantId));
        return buildScope(plantId, zoneIds);
    }

    private ScopeIds loadZoneScope(Long zoneId) {
        return buildScope(null, List.of(zoneId));
    }

    private ScopeIds loadInspectionScope(Long inspectionId) {
        List<Long> inspectionIds = List.of(inspectionId);
        List<Long> imageIds = queryIds(
                "SELECT id FROM inspection_images WHERE inspection_id = :inspectionId",
                new MapSqlParameterSource("inspectionId", inspectionId)
        );
        return buildScope(null, List.of(), inspectionIds, imageIds);
    }

    private ScopeIds loadImageScope(Long imageId) {
        return buildScope(null, List.of(), List.of(), List.of(imageId));
    }

    private ScopeIds buildScope(Long plantId, List<Long> zoneIds) {
        List<Long> inspectionIds = zoneIds.isEmpty()
                ? List.of()
                : queryIds("SELECT id FROM inspections WHERE zone_id IN (:zoneIds)", params("zoneIds", zoneIds));
        List<Long> imageIds = inspectionIds.isEmpty()
                ? List.of()
                : queryIds("SELECT id FROM inspection_images WHERE inspection_id IN (:inspectionIds)", params("inspectionIds", inspectionIds));
        return buildScope(plantId, zoneIds, inspectionIds, imageIds);
    }

    private ScopeIds buildScope(Long plantId, List<Long> zoneIds, List<Long> inspectionIds, List<Long> imageIds) {
        List<Long> equipmentIds = zoneIds.isEmpty()
                ? List.of()
                : queryIds("SELECT id FROM equipments WHERE zone_id IN (:zoneIds)", params("zoneIds", zoneIds));
        List<Long> jobIds = imageIds.isEmpty()
                ? List.of()
                : queryIds("SELECT id FROM analysis_jobs WHERE image_id IN (:imageIds)", params("imageIds", imageIds));
        List<Long> resultIds = jobIds.isEmpty()
                ? List.of()
                : queryIds("SELECT id FROM analysis_results WHERE analysis_job_id IN (:jobIds)", params("jobIds", jobIds));

        return new ScopeIds(
                plantId,
                List.copyOf(zoneIds),
                List.copyOf(equipmentIds),
                List.copyOf(inspectionIds),
                List.copyOf(imageIds),
                List.copyOf(jobIds),
                List.copyOf(resultIds)
        );
    }

    private List<Long> queryIds(String sql, MapSqlParameterSource parameters) {
        return jdbcTemplate.queryForList(sql, parameters, Long.class);
    }

    private long countIn(String sql, String parameterName, List<Long> ids) {
        if (ids.isEmpty()) {
            return 0L;
        }
        return loadCount(sql, params(parameterName, ids));
    }

    private long loadCount(String sql, MapSqlParameterSource parameters) {
        Long count = jdbcTemplate.queryForObject(sql, parameters, Long.class);
        return count == null ? 0L : count;
    }

    private void update(String sql, MapSqlParameterSource parameters) {
        if (parameters == null || parameters.getValues().isEmpty()) {
            return;
        }
        Object firstValue = parameters.getValues().values().iterator().next();
        if (firstValue instanceof List<?> list && list.isEmpty()) {
            return;
        }
        jdbcTemplate.update(sql, parameters);
    }

    private MapSqlParameterSource params(String key, List<Long> values) {
        return new MapSqlParameterSource(key, values);
    }

    private record ScopeIds(
            Long plantId,
            List<Long> zoneIds,
            List<Long> equipmentIds,
            List<Long> inspectionIds,
            List<Long> imageIds,
            List<Long> analysisJobIds,
            List<Long> analysisResultIds
    ) {
    }
}
