from typing import get_type_hints

from app.application.ports import (
    ImageMetadataPort,
    JobRepositoryPort,
    ModelRunnerPort,
    QueueMessage,
    QueuePort,
    ResultRepositoryPort,
    StoragePort,
)
from app.domain.worker_message import WorkerMessage


def test_ports_are_importable():
    assert JobRepositoryPort is not None
    assert ImageMetadataPort is not None
    assert StoragePort is not None
    assert ModelRunnerPort is not None
    assert ResultRepositoryPort is not None
    assert QueuePort is not None


def test_queue_message_can_be_created():
    message = QueueMessage(messageId="msg-1", receiptHandle="receipt-1", body='{"jobId":1000}')

    assert message.messageId == "msg-1"
    assert message.receiptHandle == "receipt-1"


def test_ports_expose_expected_methods():
    assert "get_by_id" in JobRepositoryPort.__dict__
    assert "mark_running" in JobRepositoryPort.__dict__
    assert "mark_succeeded" in JobRepositoryPort.__dict__
    assert "mark_failed" in JobRepositoryPort.__dict__
    assert "get_single_image" in ImageMetadataPort.__dict__
    assert "read_object" in StoragePort.__dict__
    assert "write_object" in StoragePort.__dict__
    assert "run" in ModelRunnerPort.__dict__
    assert "save_result" in ResultRepositoryPort.__dict__
    assert "save_defects" in ResultRepositoryPort.__dict__
    assert "receive_messages" in QueuePort.__dict__
    assert "delete_message" in QueuePort.__dict__


def test_queue_port_receive_messages_default_signature():
    hints = get_type_hints(QueuePort.receive_messages)

    assert hints["return"] == list[QueueMessage]


def test_worker_message_still_imports_with_backend_compat_payload():
    message = WorkerMessage(
        jobId=1000,
        inputType="RGB_SINGLE",
        imageId=201,
        imagePairId=None,
        requestedModelType="RGB_ONLY",
        requestedByUserId=1,
        traceId="req-20260607-0001",
        createdAt="2026-06-07T10:00:00+09:00",
    )

    assert message.jobId == 1000
    assert message.imageId == 201


def test_model_runner_port_run_signature_exposes_image_bytes():
    hints = get_type_hints(ModelRunnerPort.run)

    assert hints["image_bytes"] is bytes
