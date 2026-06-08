import json

from app.application.analysis_job_processor import ProcessingResult
from app.application.ports import QueueMessage
from app.workers.sqs_worker import SqsWorkerRunner


class FakeQueuePort:
    def __init__(self, messages=None):
        self.messages = messages or []
        self.deleted_receipts: list[str] = []

    def receive_messages(self, max_number: int = 1):
        return self.messages[:max_number]

    def delete_message(self, receipt_handle: str) -> None:
        self.deleted_receipts.append(receipt_handle)


class FakeProcessor:
    def __init__(self, result: ProcessingResult):
        self.result = result
        self.messages = []

    def process(self, message):
        self.messages.append(message)
        return self.result


def build_queue_message(body: str) -> QueueMessage:
    return QueueMessage(
        messageId="msg-1",
        receiptHandle="receipt-1",
        body=body,
    )


def build_valid_body(**overrides) -> str:
    payload = {
        "jobId": 1000,
        "inputType": "RGB_SINGLE",
        "imageId": 201,
        "imagePairId": None,
        "requestedModelType": "RGB_ONLY",
        "requestedByUserId": 1,
        "traceId": "req-20260607-0001",
        "createdAt": "2026-06-07T10:00:00+09:00",
    }
    payload.update(overrides)
    return json.dumps(payload)


def test_run_once_passes_message_to_processor():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(status="processed", jobId=1000, message="ok")
    )
    runner = SqsWorkerRunner(queue, processor)

    handled = runner.run_once()

    assert handled == 1
    assert len(processor.messages) == 1


def test_processed_result_deletes_message():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(status="processed", jobId=1000, message="ok")
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "processed"
    assert queue.deleted_receipts == ["receipt-1"]


def test_skipped_result_deletes_message():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(status="skipped", jobId=1000, message="skip")
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "skipped"
    assert queue.deleted_receipts == ["receipt-1"]


def test_failed_result_does_not_delete_message():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(
            status="failed",
            jobId=1000,
            message="failed",
            failureCode="UNKNOWN_WORKER_ERROR",
            failureMessage="failed",
        )
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "failed"
    assert queue.deleted_receipts == []


def test_invalid_json_body_is_not_deleted():
    queue = FakeQueuePort([build_queue_message("{invalid-json}")])
    processor = FakeProcessor(
        ProcessingResult(status="processed", jobId=1000, message="ok")
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.failureCode == "INVALID_WORKER_MESSAGE"
    assert queue.deleted_receipts == []
    assert processor.messages == []


def test_invalid_worker_message_is_not_deleted():
    queue = FakeQueuePort([build_queue_message(build_valid_body(traceId="  "))])
    processor = FakeProcessor(
        ProcessingResult(status="processed", jobId=1000, message="ok")
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.failureCode == "INVALID_WORKER_MESSAGE"
    assert queue.deleted_receipts == []
    assert processor.messages == []


def test_rgb_thermal_pair_message_is_passed_to_processor_and_deleted_when_skipped():
    queue = FakeQueuePort(
        [
            build_queue_message(
                build_valid_body(
                    inputType="RGB_THERMAL_PAIR",
                    imageId=None,
                    imagePairId=301,
                    requestedModelType="FUSION_AUTO",
                )
            )
        ]
    )
    processor = FakeProcessor(
        ProcessingResult(status="skipped", jobId=1000, message="skip")
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "skipped"
    assert len(processor.messages) == 1
    assert processor.messages[0].inputType.value == "RGB_THERMAL_PAIR"
    assert processor.messages[0].imageId is None
    assert processor.messages[0].imagePairId == 301
    assert queue.deleted_receipts == ["receipt-1"]
