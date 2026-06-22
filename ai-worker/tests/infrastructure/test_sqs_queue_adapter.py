from app.infrastructure.queue.sqs_queue_adapter import SqsQueueAdapter


class FakeSqsClient:
    def __init__(self, response=None):
        self.response = response or {}
        self.receive_calls = []
        self.delete_calls = []

    def receive_message(self, **kwargs):
        self.receive_calls.append(kwargs)
        return self.response

    def delete_message(self, **kwargs):
        self.delete_calls.append(kwargs)


def test_receive_messages_converts_response_to_queue_messages():
    client = FakeSqsClient(
        {
            "Messages": [
                {
                    "MessageId": "msg-1",
                    "ReceiptHandle": "receipt-1",
                    "Body": '{"jobId":1000}',
                }
            ]
        }
    )
    adapter = SqsQueueAdapter(
        sqs_client=client,
        queue_url="http://localhost:4566/000000000000/analysis-job-queue",
        wait_time_seconds=10,
        visibility_timeout_seconds=30,
    )

    messages = adapter.receive_messages(max_number=1)

    assert len(messages) == 1
    assert messages[0].messageId == "msg-1"
    assert messages[0].receiptHandle == "receipt-1"
    assert messages[0].body == '{"jobId":1000}'


def test_receive_messages_returns_empty_list_when_no_messages():
    client = FakeSqsClient({})
    adapter = SqsQueueAdapter(
        sqs_client=client,
        queue_url="http://localhost:4566/000000000000/analysis-job-queue",
        wait_time_seconds=10,
        visibility_timeout_seconds=30,
    )

    messages = adapter.receive_messages(max_number=2)

    assert messages == []


def test_delete_message_passes_queue_url_and_receipt_handle():
    client = FakeSqsClient({})
    adapter = SqsQueueAdapter(
        sqs_client=client,
        queue_url="http://localhost:4566/000000000000/analysis-job-queue",
        wait_time_seconds=10,
        visibility_timeout_seconds=30,
    )

    adapter.delete_message("receipt-1")

    assert client.delete_calls == [
        {
            "QueueUrl": "http://localhost:4566/000000000000/analysis-job-queue",
            "ReceiptHandle": "receipt-1",
        }
    ]


def test_receive_messages_uses_visibility_timeout_when_present():
    client = FakeSqsClient({})
    adapter = SqsQueueAdapter(
        sqs_client=client,
        queue_url="http://localhost:4566/000000000000/analysis-job-queue",
        wait_time_seconds=10,
        visibility_timeout_seconds=30,
    )

    adapter.receive_messages(max_number=3)

    assert client.receive_calls[0]["VisibilityTimeout"] == 30
    assert client.receive_calls[0]["WaitTimeSeconds"] == 10
    assert client.receive_calls[0]["MaxNumberOfMessages"] == 3


def test_receive_messages_omits_visibility_timeout_when_not_set():
    client = FakeSqsClient({})
    adapter = SqsQueueAdapter(
        sqs_client=client,
        queue_url="http://localhost:4566/000000000000/analysis-job-queue",
        wait_time_seconds=10,
        visibility_timeout_seconds=None,
    )

    adapter.receive_messages()

    assert "VisibilityTimeout" not in client.receive_calls[0]


