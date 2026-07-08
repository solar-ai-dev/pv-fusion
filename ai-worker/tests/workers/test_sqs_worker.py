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


class RaisingProcessor:
    """process() 가 예외를 발생시키는 Fake."""
    def __init__(self, error: Exception):
        self.error = error
        self.call_count = 0

    def process(self, message):
        self.call_count += 1
        raise self.error


def build_queue_message(body: str) -> QueueMessage:
    return QueueMessage(messageId="msg-1", receiptHandle="receipt-1", body=body)


def build_valid_body(**overrides) -> str:
    payload = {
        "jobId": 1000,
        "inputType": "RGB_SINGLE",
        "imageId": 201,
        "requestedModelType": "RGB_ONLY",
        "requestedByUserId": 1,
        "traceId": "req-20260607-0001",
        "createdAt": "2026-06-07T10:00:00+09:00",
    }
    payload.update(overrides)
    return json.dumps(payload)


# ---------------------------------------------------------------------------
# 기존 정상 처리 / 스킵 테스트
# ---------------------------------------------------------------------------

def test_run_once_passes_message_to_processor():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    handled = runner.run_once()

    assert handled == 1
    assert len(processor.messages) == 1


def test_processed_result_deletes_message():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "processed"
    assert queue.deleted_receipts == ["receipt-1"]


def test_skipped_result_deletes_message():
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(ProcessingResult(status="skipped", jobId=1000, message="skip"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "skipped"
    assert queue.deleted_receipts == ["receipt-1"]


def test_failed_non_terminal_result_does_not_delete_message():
    """일시적 장애(terminal=False)는 재시도를 위해 메시지를 삭제하지 않아야 한다."""
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(
            status="failed",
            jobId=1000,
            message="failed",
            failureCode="MARK_RUNNING_ERROR",
            failureMessage="failed",
            terminal=False,
        )
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "failed"
    assert queue.deleted_receipts == []


def test_failed_terminal_result_deletes_message():
    """job 이 DB 에서 FAILED 로 확정된 경우(terminal=True) SQS 메시지를 즉시 삭제해야 한다."""
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(
            status="failed",
            jobId=1000,
            message="Job marked as failed.",
            failureCode="IMAGE_METADATA_NOT_FOUND",
            failureMessage="Image metadata was not found.",
            terminal=True,
        )
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "failed"
    assert queue.deleted_receipts == ["receipt-1"]


def test_running_non_stale_job_does_not_delete_message():
    """최근 RUNNING(stale 아님) job은 SQS 메시지를 삭제하지 않아야 한다."""
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(
            status="failed",
            jobId=1000,
            message="Job is currently running.",
            failureCode="JOB_ALREADY_RUNNING",
            failureMessage="Job is currently running.",
            terminal=False,
        )
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "failed"
    assert result.failureCode == "JOB_ALREADY_RUNNING"
    assert queue.deleted_receipts == []


def test_stale_running_job_terminal_deletes_message():
    """stale RUNNING job이 FAILED 처리된 경우(terminal=True) SQS 메시지를 삭제해야 한다."""
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(
            status="failed",
            jobId=1000,
            message="Job exceeded stale threshold.",
            failureCode="STALE_RUNNING_JOB",
            failureMessage="Job exceeded stale threshold.",
            terminal=True,
        )
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "failed"
    assert result.failureCode == "STALE_RUNNING_JOB"
    assert queue.deleted_receipts == ["receipt-1"]


def test_job_not_found_terminal_deletes_message():
    """JOB_NOT_FOUND(terminal=True) 는 재처리가 무의미하므로 메시지를 삭제해야 한다."""
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = FakeProcessor(
        ProcessingResult(
            status="failed",
            jobId=1000,
            message="Analysis job was not found.",
            failureCode="JOB_NOT_FOUND",
            failureMessage="Analysis job was not found.",
            terminal=True,
        )
    )
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "failed"
    assert queue.deleted_receipts == ["receipt-1"]


# ---------------------------------------------------------------------------
# 파싱 실패 테스트
# ---------------------------------------------------------------------------

def test_invalid_json_body_is_deleted():
    queue = FakeQueuePort([build_queue_message("{invalid-json}")])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.failureCode == "INVALID_WORKER_MESSAGE"
    assert queue.deleted_receipts == ["receipt-1"]
    assert processor.messages == []


def test_invalid_worker_message_is_deleted():
    queue = FakeQueuePort([build_queue_message(build_valid_body(traceId="  "))])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.failureCode == "INVALID_WORKER_MESSAGE"
    assert queue.deleted_receipts == ["receipt-1"]
    assert processor.messages == []


def test_invalid_message_result_is_terminal():
    """파싱 불가 poison message 는 terminal=True 로 처리되어야 한다."""
    queue = FakeQueuePort([build_queue_message("{not-json}")])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.terminal is True


def test_created_at_null_message_is_processed():
    queue = FakeQueuePort([build_queue_message(build_valid_body(createdAt=None))])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "processed"
    assert processor.messages[0].createdAt is not None
    assert queue.deleted_receipts == ["receipt-1"]


def test_backend_legacy_image_pair_id_null_field_is_ignored():
    queue = FakeQueuePort([build_queue_message(build_valid_body(imagePairId=None))])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.status == "processed"
    assert processor.messages[0].imageId == 201
    assert queue.deleted_receipts == ["receipt-1"]


def test_pair_message_is_rejected():
    queue = FakeQueuePort(
        [
            build_queue_message(
                build_valid_body(
                    inputType="RGB_THERMAL_PAIR",
                    requestedModelType="RGB_ONLY",
                    imageId=201,
                )
            )
        ]
    )
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    result = runner.handle_message(queue.messages[0])

    assert result.failureCode == "INVALID_WORKER_MESSAGE"
    assert processor.messages == []
    assert queue.deleted_receipts == ["receipt-1"]


# ---------------------------------------------------------------------------
# 폴링 루프 생존 테스트
# ---------------------------------------------------------------------------

def test_run_forever_stops_after_stop_is_requested():
    queue = FakeQueuePort([])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)

    call_count = 0

    def run_once(max_number: int = 1) -> int:
        nonlocal call_count
        call_count += 1
        runner.request_stop()
        return 0

    runner.run_once = run_once

    runner.run_forever()

    assert call_count == 1


def test_run_forever_prevents_duplicate_start():
    queue = FakeQueuePort([])
    processor = FakeProcessor(ProcessingResult(status="processed", jobId=1000, message="ok"))
    runner = SqsWorkerRunner(queue, processor)
    runner._is_running = True

    try:
        runner.run_forever()
    except RuntimeError as error:
        assert str(error) == "SQS worker loop is already running."
    else:
        raise AssertionError("Expected RuntimeError for duplicate worker start.")


def test_handle_message_exception_does_not_kill_run_once():
    """
    handle_message 내부에서 예외가 발생해도 run_once 가 예외를 삼키고
    폴링 루프를 계속 유지해야 한다.
    """
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = RaisingProcessor(RuntimeError("unexpected crash in process()"))
    runner = SqsWorkerRunner(queue, processor)

    # handle_message 가 예외를 던지더라도 run_once 는 정상 반환해야 한다.
    handled = runner.run_once()

    assert handled == 1
    assert processor.call_count == 1


def test_run_once_continues_after_single_message_exception():
    """
    메시지 2개 중 첫 번째에서 예외가 발생해도 두 번째 메시지는 정상 처리되어야 한다.
    """
    msg1 = QueueMessage(messageId="msg-1", receiptHandle="receipt-1", body=build_valid_body(jobId=1))
    msg2 = QueueMessage(messageId="msg-2", receiptHandle="receipt-2", body=build_valid_body(jobId=2, imageId=202))

    crash_for_job1 = True

    class SelectiveRaisingProcessor:
        def __init__(self):
            self.processed_ids = []

        def process(self, message):
            nonlocal crash_for_job1
            if crash_for_job1 and message.jobId == 1:
                crash_for_job1 = False
                raise RuntimeError("crash on first message")
            self.processed_ids.append(message.jobId)
            return ProcessingResult(status="processed", jobId=message.jobId, message="ok")

    fake_queue = FakeQueuePort([msg1, msg2])
    selective_processor = SelectiveRaisingProcessor()
    runner = SqsWorkerRunner(fake_queue, selective_processor)

    handled = runner.run_once(max_number=2)

    assert handled == 2
    assert 2 in selective_processor.processed_ids


def test_process_exception_does_not_propagate_to_run_forever():
    """
    process() 예외가 run_forever 폴링 루프 전체를 죽이지 않아야 한다.
    run_once 에서 예외를 잡아야 하므로 run_forever 는 정상 종료되어야 한다.
    """
    queue = FakeQueuePort([build_queue_message(build_valid_body())])
    processor = RaisingProcessor(RuntimeError("crash inside process"))
    runner = SqsWorkerRunner(queue, processor)

    call_count = 0
    original_run_once = runner.run_once

    def patched_run_once(max_number: int = 1) -> int:
        nonlocal call_count
        call_count += 1
        result = original_run_once(max_number=max_number)
        runner.request_stop()
        return result

    runner.run_once = patched_run_once

    # run_forever 가 예외 없이 정상 종료되어야 한다.
    runner.run_forever()

    assert call_count == 1
