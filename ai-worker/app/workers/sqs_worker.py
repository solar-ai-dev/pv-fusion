import json
import logging
from json import JSONDecodeError
from threading import Event

from pydantic import ValidationError

from app.application.analysis_job_processor import AnalysisJobProcessor, ProcessingResult
from app.application.ports import QueueMessage, QueuePort
from app.domain.worker_message import WorkerMessage

logger = logging.getLogger(__name__)

_MAX_BODY_PREVIEW_CHARS = 300


class SqsWorkerRunner:
    def __init__(self, queue_port: QueuePort, processor: AnalysisJobProcessor) -> None:
        self._queue_port = queue_port
        self._processor = processor
        self._stop_requested = Event()
        self._is_running = False

    def run_once(self, max_number: int = 1) -> int:
        """
        메시지를 수신하고 각각 처리한다.
        handle_message 내 예외는 폴링 루프를 죽이지 않도록 여기서 잡아 로그를 남긴다.
        receive_messages 자체가 실패(SQS 연결 불가 등)하면 caller 로 전파한다.
        """
        handled = 0
        messages = self._queue_port.receive_messages(max_number=max_number)
        for queue_message in messages:
            try:
                self.handle_message(queue_message)
            except Exception:
                logger.exception(
                    "worker.unexpected_exception phase=handle_message messageId=%s",
                    queue_message.messageId,
                )
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
        logger.info(
            "sqs.message.received messageId=%s hasReceiptHandle=%s bodyLength=%s",
            queue_message.messageId,
            bool(queue_message.receiptHandle),
            len(queue_message.body),
        )

        logger.debug(
            "worker_message.parse.start messageId=%s",
            queue_message.messageId,
        )
        message = self._parse_message(queue_message.body)

        if message is None:
            logger.warning(
                "worker_message.parse.failed failure_code=INVALID_WORKER_MESSAGE "
                "messageId=%s bodyLength=%s bodyPreview=%s",
                queue_message.messageId,
                len(queue_message.body),
                queue_message.body[:_MAX_BODY_PREVIEW_CHARS] if queue_message.body else "",
            )
            logger.info(
                "sqs.message.delete.before messageId=%s reason=invalid_message",
                queue_message.messageId,
            )
            self._queue_port.delete_message(queue_message.receiptHandle)
            logger.info(
                "sqs.message.delete.after messageId=%s reason=invalid_message",
                queue_message.messageId,
            )
            return ProcessingResult(
                status="failed",
                jobId=0,
                message="Invalid worker message.",
                failureCode="INVALID_WORKER_MESSAGE",
                failureMessage="Invalid worker message.",
                terminal=True,
            )

        logger.info(
            "worker_message.parse.success messageId=%s jobId=%s imageId=%s "
            "inputType=%s requestedModelType=%s traceId=%s",
            queue_message.messageId,
            message.jobId,
            message.imageId,
            message.inputType.value,
            message.requestedModelType.value,
            message.traceId,
        )

        result = self._processor.process(message)

        should_delete = result.status in {"processed", "skipped"} or result.terminal
        if should_delete:
            logger.info(
                "sqs.message.delete.before messageId=%s jobId=%s status=%s terminal=%s",
                queue_message.messageId,
                result.jobId,
                result.status,
                result.terminal,
            )
            self._queue_port.delete_message(queue_message.receiptHandle)
            logger.info(
                "sqs.message.delete.after messageId=%s jobId=%s status=%s",
                queue_message.messageId,
                result.jobId,
                result.status,
            )
        elif result.failureCode is not None:
            logger.warning(
                "Analysis job message processing failed — message will be retried after visibility timeout. "
                "messageId=%s jobId=%s traceId=%s errorCode=%s",
                queue_message.messageId,
                message.jobId,
                message.traceId,
                result.failureCode,
            )

        return result

    def _parse_message(self, body: str) -> WorkerMessage | None:
        try:
            payload = json.loads(body)
            return WorkerMessage(**payload)
        except (JSONDecodeError, ValidationError):
            return None
