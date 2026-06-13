import json
from json import JSONDecodeError
from threading import Event

from pydantic import ValidationError

from app.application.analysis_job_processor import AnalysisJobProcessor, ProcessingResult
from app.application.ports import QueueMessage, QueuePort
from app.domain.worker_message import WorkerMessage


class SqsWorkerRunner:
    def __init__(self, queue_port: QueuePort, processor: AnalysisJobProcessor) -> None:
        self._queue_port = queue_port
        self._processor = processor
        self._stop_requested = Event()
        self._is_running = False

    def run_once(self, max_number: int = 1) -> int:
        handled = 0
        for queue_message in self._queue_port.receive_messages(max_number=max_number):
            self.handle_message(queue_message)
            handled += 1
        return handled

    def run_forever(self, max_number: int = 1, poll_interval_seconds: int = 5) -> None:
        if self._is_running:
            raise RuntimeError("SQS worker loop is already running.")

        self._stop_requested.clear()
        self._is_running = True
        try:
            while not self._stop_requested.is_set():
                handled = self.run_once(max_number=max_number)
                if handled == 0 and poll_interval_seconds > 0:
                    self._stop_requested.wait(timeout=poll_interval_seconds)
        finally:
            self._is_running = False

    def request_stop(self) -> None:
        self._stop_requested.set()

    def handle_message(self, queue_message: QueueMessage) -> ProcessingResult:
        message = self._parse_message(queue_message.body)
        if message is None:
            return ProcessingResult(
                status="failed",
                jobId=0,
                message="Invalid worker message.",
                failureCode="INVALID_WORKER_MESSAGE",
                failureMessage="Invalid worker message.",
            )

        result = self._processor.process(message)
        if result.status in {"processed", "skipped"}:
            self._queue_port.delete_message(queue_message.receiptHandle)
        return result

    def _parse_message(self, body: str) -> WorkerMessage | None:
        try:
            payload = json.loads(body)
            return WorkerMessage(**payload)
        except (JSONDecodeError, ValidationError):
            return None
