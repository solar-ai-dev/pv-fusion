from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

from app.application.errors import JobStateTransitionError
from app.application.ports import JobRepositoryPort
from app.domain.analysis_job import AnalysisJob
from app.domain.enums import InputType, JobStatus, ModelType, RequestedModelType


class PostgresAnalysisJobRepository(JobRepositoryPort):
    def __init__(self, connection_factory: Callable[[], Any]) -> None:
        self._connection_factory = connection_factory

    def get_by_id(self, job_id: int) -> AnalysisJob | None:
        query = """
            SELECT
                id,
                image_id,
                image_pair_id,
                input_type,
                requested_model_type,
                model_type,
                job_status,
                requested_by_user_id,
                trace_id,
                failure_code,
                failure_message
            FROM analysis_jobs
            WHERE id = %s
        """
        with self._connection_factory() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, (job_id,))
                row = cursor.fetchone()
        if row is None:
            return None
        return AnalysisJob(
            jobId=row["id"],
            imageId=row["image_id"],
            imagePairId=row["image_pair_id"],
            inputType=InputType(row["input_type"]),
            requestedModelType=RequestedModelType(row["requested_model_type"]),
            modelType=ModelType(row["model_type"]) if row["model_type"] else None,
            jobStatus=JobStatus(row["job_status"]),
            requestedByUserId=row["requested_by_user_id"],
            traceId=row["trace_id"],
            failureCode=row["failure_code"],
            failureMessage=row["failure_message"],
        )

    def mark_running(self, job_id: int) -> None:
        now = _utc_now()
        query = """
            UPDATE analysis_jobs
            SET job_status = %s,
                started_at = %s,
                updated_at = %s
            WHERE id = %s
              AND job_status = %s
        """
        self._execute_update(
            query,
            (JobStatus.RUNNING.value, now, now, job_id, JobStatus.QUEUED.value),
            "Job could not transition to RUNNING.",
        )

    def mark_succeeded(self, job_id: int) -> None:
        now = _utc_now()
        query = """
            UPDATE analysis_jobs
            SET job_status = %s,
                completed_at = %s,
                updated_at = %s
            WHERE id = %s
              AND job_status = %s
        """
        self._execute_update(
            query,
            (JobStatus.SUCCEEDED.value, now, now, job_id, JobStatus.RUNNING.value),
            "Job could not transition to SUCCEEDED.",
        )

    def mark_failed(self, job_id: int, failure_code: str, failure_message: str) -> None:
        now = _utc_now()
        query = """
            UPDATE analysis_jobs
            SET job_status = %s,
                failure_code = %s,
                failure_message = %s,
                completed_at = %s,
                updated_at = %s
            WHERE id = %s
              AND job_status IN (%s, %s)
        """
        self._execute_update(
            query,
            (
                JobStatus.FAILED.value,
                _normalize_failure_code(failure_code),
                _normalize_failure_message(failure_message),
                now,
                now,
                job_id,
                JobStatus.QUEUED.value,
                JobStatus.RUNNING.value,
            ),
            "Job could not transition to FAILED.",
        )

    def _execute_update(self, query: str, params: tuple[Any, ...], error_message: str) -> None:
        with self._connection_factory() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                if cursor.rowcount == 0:
                    raise JobStateTransitionError(error_message)
            connection.commit()


def _normalize_failure_code(value: str) -> str:
    return value.strip()[:100]


def _normalize_failure_message(value: str) -> str:
    return value.strip()[:1000]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)
