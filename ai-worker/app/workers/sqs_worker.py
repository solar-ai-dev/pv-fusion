import json
from json import JSONDecodeError

from pydantic import ValidationError

from app.application.analysis_job_processor import AnalysisJobProcessor, ProcessingResult
from app.application.ports import QueueMessage, QueuePort
from app.domain.worker_message import WorkerMessage


class SqsWorkerRunner:
    def __init__(self, queue_port: QueuePort, processor: AnalysisJobProcessor) -> None:
        self._queue_port = queue_port
        self._processor = processor

    def run_once(self, max_number: int = 1) -> int:
        handled = 0
        for queue_message in self._queue_port.receive_messages(max_number=max_number):
            self.handle_message(queue_message)
            handled += 1
        return handled

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
