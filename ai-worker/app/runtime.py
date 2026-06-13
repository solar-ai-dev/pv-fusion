import asyncio
import logging
from contextlib import suppress

from app.application.analysis_job_processor import AnalysisJobProcessor
from app.config.settings import Settings
from app.infrastructure.db.analysis_job_repository import PostgresAnalysisJobRepository
from app.infrastructure.db.image_metadata_repository import PostgresImageMetadataRepository
from app.infrastructure.db.result_repository import PostgresResultRepository
from app.infrastructure.db.session import create_connection_factory
from app.infrastructure.model.model_registry import ModelRegistry
from app.infrastructure.model.onnx_model_runner import OnnxModelRunner
from app.infrastructure.model.onnx_session import OnnxSessionProvider
from app.infrastructure.queue.sqs_queue_adapter import SqsQueueAdapter
from app.infrastructure.storage.object_storage_adapter import ObjectStorageAdapter
from app.workers.sqs_worker import SqsWorkerRunner

logger = logging.getLogger(__name__)


class WorkerRuntime:
    def __init__(self, settings: Settings, runner: SqsWorkerRunner) -> None:
        self._settings = settings
        self._runner = runner
        self._task: asyncio.Task[None] | None = None
        self._status = "disabled" if not settings.workerEnabled else "stopped"

    @property
    def status(self) -> str:
        return self._status

    async def start(self) -> bool:
        if not self._settings.workerEnabled:
            self._status = "disabled"
            logger.info("AI worker is disabled. Skipping SQS worker startup.")
            return False

        if self._task is not None and not self._task.done():
            logger.info("SQS worker loop is already running.")
            return False

        self._status = "starting"
        self._task = asyncio.create_task(self._run_loop(), name="ai-worker-sqs-loop")
        self._status = "running"
        logger.info("SQS worker loop started.")
        return True

    async def stop(self) -> bool:
        if not self._settings.workerEnabled:
            self._status = "disabled"
            return False

        if self._task is None:
            self._status = "stopped"
            return False

        self._status = "stopping"
        self._runner.request_stop()

        try:
            await asyncio.wait_for(self._task, timeout=self._shutdown_timeout_seconds())
        except asyncio.TimeoutError:
            logger.warning("Timed out while waiting for the SQS worker loop to stop. Cancelling task.")
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
        except Exception:
            logger.exception("SQS worker loop exited with an error during shutdown.")
        finally:
            self._task = None
            if self._status != "failed":
                self._status = "stopped"
            logger.info("SQS worker loop stopped.")

        return True

    async def _run_loop(self) -> None:
        try:
            await asyncio.to_thread(
                self._runner.run_forever,
                max_number=self._settings.workerMaxMessages,
                poll_interval_seconds=self._settings.workerPollIntervalSeconds,
            )
        except Exception:
            self._status = "failed"
            logger.exception("SQS worker loop terminated unexpectedly.")
            raise

    def _shutdown_timeout_seconds(self) -> int:
        return max(
            1,
            self._settings.sqsWaitTimeSeconds + self._settings.workerPollIntervalSeconds + 1,
        )


def create_worker_runtime(settings: Settings) -> WorkerRuntime:
    connection_factory = create_connection_factory(settings)
    job_repository = PostgresAnalysisJobRepository(connection_factory)
    image_metadata = PostgresImageMetadataRepository(connection_factory)
    storage = ObjectStorageAdapter(settings)
    model_registry = ModelRegistry(settings)
    session_provider = OnnxSessionProvider()
    model_runner = OnnxModelRunner(model_registry, session_provider)
    result_repository = PostgresResultRepository(connection_factory)
    processor = AnalysisJobProcessor(
        job_repository=job_repository,
        image_metadata=image_metadata,
        storage=storage,
        model_runner=model_runner,
        result_repository=result_repository,
    )
    queue = SqsQueueAdapter(settings)
    runner = SqsWorkerRunner(queue, processor)
    return WorkerRuntime(settings, runner)
