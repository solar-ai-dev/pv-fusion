from collections.abc import Callable
from typing import Any

from app.application.ports import ResultRepositoryPort
from app.domain.analysis_result import AnalysisResultDraft
from app.domain.detected_defect import DetectedDefectDraft


class PostgresResultRepository(ResultRepositoryPort):
    def __init__(self, connection_factory: Callable[[], Any]) -> None:
        self._connection_factory = connection_factory

    def save_result(self, result: AnalysisResultDraft) -> int:
        query = """
            INSERT INTO analysis_results (
                analysis_job_id,
                model_type,
                model_name,
                model_version,
                model_format,
                runtime,
                input_size,
                threshold,
                result_status,
                anomaly_count,
                max_confidence,
                area_ratio,
                severity_score,
                severity_level,
                action_candidate,
                priority_level,
                review_status,
                bbox_bucket_name,
                bbox_object_key,
                bbox_file_url,
                heatmap_bucket_name,
                heatmap_object_key,
                heatmap_file_url,
                mask_bucket_name,
                mask_object_key,
                mask_file_url,
                analyzed_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id
        """
        params = (
            result.analysisJobId,
            result.modelType.value,
            result.modelName,
            result.modelVersion,
            result.modelFormat,
            result.runtime,
            result.inputSize,
            result.threshold,
            result.resultStatus.value,
            result.anomalyCount,
            result.maxConfidence,
            result.areaRatio,
            result.severityScore,
            "LOW",
            result.actionCandidate.value,
            "LOW",
            "UNCHECKED",
            result.bboxBucketName,
            result.bboxObjectKey,
            result.bboxFileUrl,
            result.heatmapBucketName,
            result.heatmapObjectKey,
            result.heatmapFileUrl,
            result.maskBucketName,
            result.maskObjectKey,
            result.maskFileUrl,
            result.analyzedAt,
        )
        with self._connection_factory() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                row = cursor.fetchone()
            connection.commit()
        return int(row["id"])

    def save_defects(self, analysis_result_id: int, defects: list[DetectedDefectDraft]) -> None:
        if not defects:
            return
        query = """
            INSERT INTO detected_defects (
                analysis_result_id,
                defect_type,
                defect_source,
                confidence,
                area_ratio,
                bbox_x,
                bbox_y,
                bbox_width,
                bbox_height,
                mask_bucket_name,
                mask_object_key,
                mask_file_url,
                severity_score,
                severity_level,
                action_candidate
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """
        with self._connection_factory() as connection:
            with connection.cursor() as cursor:
                for defect in defects:
                    cursor.execute(
                        query,
                        (
                            analysis_result_id,
                            defect.defectType,
                            defect.defectSource,
                            defect.confidence,
                            defect.areaRatio,
                            defect.bboxX,
                            defect.bboxY,
                            defect.bboxWidth,
                            defect.bboxHeight,
                            defect.maskBucketName,
                            defect.maskObjectKey,
                            defect.maskFileUrl,
                            defect.severityScore,
                            "LOW",
                            defect.actionCandidate.value,
                        ),
                    )
            connection.commit()
