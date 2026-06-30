from typing import Any

from app.application.ports import QueueMessage, QueuePort


class SqsQueueAdapter(QueuePort):
    def __init__(
        self,
        sqs_client: Any,
        queue_url: str,
        wait_time_seconds: int = 5,
        visibility_timeout_seconds: int | None = None,
    ) -> None:
        self._sqs_client = sqs_client
        self._queue_url = queue_url
        self._wait_time_seconds = wait_time_seconds
        self._visibility_timeout_seconds = visibility_timeout_seconds

    def receive_messages(self, max_number: int = 1) -> list[QueueMessage]:
        response = self._sqs_client.receive_message(
            QueueUrl=self._require_queue_url(),
            MaxNumberOfMessages=max_number,
            WaitTimeSeconds=self._wait_time_seconds,
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
        queue_url = self._queue_url.strip()
        if not queue_url:
            raise ValueError("SQS queue URL is not configured.")
        return queue_url

    def _visibility_timeout_option(self) -> dict[str, int]:
        if self._visibility_timeout_seconds is None:
            return {}
        return {"VisibilityTimeout": self._visibility_timeout_seconds}
