import logging
import time
from collections.abc import Callable
from typing import Any

from app.application.errors import JobStateTransitionError
from app.application.ports import ResultRepositoryPort
from app.domain.analysis_result import AnalysisResultDraft
from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import JobStatus

logger = logging.getLogger(__name__)


def _ms(t0: float) -> int:
    return int((time.perf_counter() - t0) * 1000)


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

    def save_completed_result(
        self, result: AnalysisResultDraft, defects: list[DetectedDefectDraft]
    ) -> int:
        """
        analysis_results INSERT + detected_defects INSERT + analysis_jobs SUCCEEDED 전이를
        하나의 트랜잭션으로 원자적으로 커밋한다.
        """
        operation = "analysis_result.save_completed"
        logger.info(
            "db.acquire.before operation=%s jobId=%s defectCount=%s",
            operation, result.analysisJobId, len(defects),
        )
        t_acquire = time.perf_counter()
        analysis_result_id: int | None = None
        try:
            with self._connection_factory() as connection:
                logger.info(
                    "db.acquire.after operation=%s jobId=%s elapsedMs=%s",
                    operation, result.analysisJobId, _ms(t_acquire),
                )

                logger.info(
                    "db.execute.before operation=%s jobId=%s defectCount=%s",
                    operation, result.analysisJobId, len(defects),
                )
                t_exec = time.perf_counter()
                with connection.cursor() as cursor:
                    analysis_result_id = self._insert_result(cursor, result)
                    self._insert_defects(cursor, analysis_result_id, defects)
                    self._mark_job_succeeded(cursor, result.analysisJobId)
                logger.info(
                    "db.execute.after operation=%s jobId=%s analysisResultId=%s elapsedMs=%s",
                    operation, result.analysisJobId, analysis_result_id, _ms(t_exec),
                )

                logger.info(
                    "db.commit.before operation=%s jobId=%s", operation, result.analysisJobId
                )
                t_commit = time.perf_counter()
                connection.commit()
                logger.info(
                    "db.commit.after operation=%s jobId=%s elapsedMs=%s",
                    operation, result.analysisJobId, _ms(t_commit),
                )
        finally:
            logger.info(
                "db.release.after operation=%s jobId=%s", operation, result.analysisJobId
            )

        return analysis_result_id  # type: ignore[return-value]

    def _insert_result(self, cursor: Any, result: AnalysisResultDraft) -> int:
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
        cursor.execute(query, self._result_params(result))
        row = cursor.fetchone()
        return int(row["id"])

    def _insert_defects(self, cursor: Any, analysis_result_id: int, defects: list[DetectedDefectDraft]) -> None:
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
        for defect in defects:
            cursor.execute(query, self._defect_params(analysis_result_id, defect))

    def _mark_job_succeeded(self, cursor: Any, job_id: int) -> None:
        query = """
            UPDATE analysis_jobs
            SET job_status = %s,
                completed_at = now(),
                updated_at = now()
            WHERE id = %s
              AND job_status = %s
        """
        cursor.execute(
            query,
            (JobStatus.SUCCEEDED.value, job_id, JobStatus.RUNNING.value),
        )
        if cursor.rowcount == 0:
            raise JobStateTransitionError("Job could not transition to SUCCEEDED.")

    def _result_params(self, result: AnalysisResultDraft) -> tuple[Any, ...]:
        return (
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

    def _defect_params(self, analysis_result_id: int, defect: DetectedDefectDraft) -> tuple[Any, ...]:
        return (
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
        )
