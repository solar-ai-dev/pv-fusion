from typing import Any

try:
    import boto3
except ModuleNotFoundError:  # pragma: no cover - environment dependent
    boto3 = None

from app.application.ports import QueueMessage, QueuePort
from app.config.settings import Settings


class SqsQueueAdapter(QueuePort):
    def __init__(self, settings: Settings, sqs_client: Any | None = None) -> None:
        self._settings = settings
        self._sqs_client = sqs_client or self._build_client(settings)

    def receive_messages(self, max_number: int = 1) -> list[QueueMessage]:
        response = self._sqs_client.receive_message(
            QueueUrl=self._require_queue_url(),
            MaxNumberOfMessages=max_number,
            WaitTimeSeconds=self._settings.sqsWaitTimeSeconds,
            **self._visibility_timeout_option(),
        )
        messages = response.get("Messages", [])
        return [
            QueueMessage(
                messageId=message["MessageId"],
                receiptHandle=message["ReceiptHandle"],
                body=message["Body"],
            )
            for message in messages
        ]

    def delete_message(self, receipt_handle: str) -> None:
        self._sqs_client.delete_message(
            QueueUrl=self._require_queue_url(),
            ReceiptHandle=receipt_handle,
        )

    def _require_queue_url(self) -> str:
        queue_url = self._settings.sqsQueueUrl.strip()
        if not queue_url:
            raise ValueError("SQS queue URL is not configured.")
        return queue_url

    def _visibility_timeout_option(self) -> dict[str, int]:
        if self._settings.sqsVisibilityTimeoutSeconds is None:
            return {}
        return {"VisibilityTimeout": self._settings.sqsVisibilityTimeoutSeconds}

    @staticmethod
    def _build_client(settings: Settings) -> Any:
        if boto3 is None:
            raise ModuleNotFoundError("boto3 is required to create the SQS client.")
        kwargs: dict[str, Any] = {
            "service_name": "sqs",
            "region_name": settings.awsRegion,
        }
        if settings.sqsEndpointUrl:
            kwargs["endpoint_url"] = settings.sqsEndpointUrl
        return boto3.client(**kwargs)
