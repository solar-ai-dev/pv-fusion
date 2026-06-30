import sys
import types

from app.config.settings import Settings
from app.application.errors import JobStateTransitionError
from app.infrastructure.db.analysis_job_repository import PostgresAnalysisJobRepository
from app.infrastructure.db.session import create_connection_factory


class FakeCursor:
    def __init__(self, fetchone_result=None, rowcount=1):
        self.fetchone_result = fetchone_result
        self.rowcount = rowcount
        self.executed = []

    def execute(self, query, params):
        self.executed.append((query, params))

    def fetchone(self):
        return self.fetchone_result

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class FakeConnection:
    def __init__(self, cursor: FakeCursor):
        self._cursor = cursor
        self.committed = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_get_by_id_maps_row_to_analysis_job():
    cursor = FakeCursor(
        fetchone_result={
            "id": 1000,
            "image_id": 201,
            "image_pair_id": None,
            "input_type": "RGB_SINGLE",
            "requested_model_type": "RGB_ONLY",
            "model_type": "RGB_ONLY",
            "job_status": "QUEUED",
            "requested_by_user_id": 1,
            "trace_id": "req-1",
            "failure_code": None,
            "failure_message": None,
        }
    )
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(cursor))

    job = repository.get_by_id(1000)

    assert job is not None
    assert job.jobId == 1000
    assert job.inputType.value == "RGB_SINGLE"
    assert job.requestedModelType.value == "RGB_ONLY"
    assert job.modelType.value == "RGB_ONLY"
    assert job.jobStatus.value == "QUEUED"


def test_get_by_id_returns_none_when_row_is_missing():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(fetchone_result=None)))

    job = repository.get_by_id(9999)

    assert job is None


def test_mark_running_updates_status_and_timestamps():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresAnalysisJobRepository(lambda: connection)

    repository.mark_running(1000)

    query, params = cursor.executed[0]
    assert "job_status = %s" in query
    assert "started_at = %s" in query
    assert "AND job_status = %s" in query
    assert params[0] == "RUNNING"
    assert params[3] == 1000
    assert params[4] == "QUEUED"
    assert connection.committed is True


def test_mark_succeeded_updates_status_and_completed_at():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresAnalysisJobRepository(lambda: connection)

    repository.mark_succeeded(1000)

    query, params = cursor.executed[0]
    assert "completed_at = %s" in query
    assert "AND job_status = %s" in query
    assert params[0] == "SUCCEEDED"
    assert params[3] == 1000
    assert params[4] == "RUNNING"
    assert connection.committed is True


def test_mark_failed_updates_status_failure_fields_and_completed_at():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresAnalysisJobRepository(lambda: connection)

    repository.mark_failed(1000, "QUEUE_UNAVAILABLE", "queue unavailable")

    query, params = cursor.executed[0]
    assert "failure_code = %s" in query
    assert "failure_message = %s" in query
    assert "completed_at = %s" in query
    assert "AND job_status IN (%s, %s)" in query
    assert params[0] == "FAILED"
    assert params[1] == "QUEUE_UNAVAILABLE"
    assert params[2] == "queue unavailable"
    assert params[5] == 1000
    assert params[6] == "QUEUED"
    assert params[7] == "RUNNING"
    assert connection.committed is True


def test_mark_failed_normalizes_failure_message_before_saving():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresAnalysisJobRepository(lambda: connection)

    repository.mark_failed(1000, " CODE ", "  plain failure message  ")

    _, params = cursor.executed[0]
    assert params[1] == "CODE"
    assert params[2] == "plain failure message"


def test_mark_running_raises_when_conditional_update_affects_no_rows():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(rowcount=0)))

    try:
        repository.mark_running(1000)
    except JobStateTransitionError as exc:
        assert str(exc) == "Job could not transition to RUNNING."
    else:
        raise AssertionError("Expected JobStateTransitionError for mark_running.")


def test_mark_succeeded_raises_when_conditional_update_affects_no_rows():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(rowcount=0)))

    try:
        repository.mark_succeeded(1000)
    except JobStateTransitionError as exc:
        assert str(exc) == "Job could not transition to SUCCEEDED."
    else:
        raise AssertionError("Expected JobStateTransitionError for mark_succeeded.")


def test_mark_failed_raises_when_conditional_update_affects_no_rows():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(rowcount=0)))

    try:
        repository.mark_failed(1000, "QUEUE_UNAVAILABLE", "queue unavailable")
    except JobStateTransitionError as exc:
        assert str(exc) == "Job could not transition to FAILED."
    else:
        raise AssertionError("Expected JobStateTransitionError for mark_failed.")


def test_create_connection_factory_requires_database_url():
    settings = Settings(databaseUrl="")
    factory = create_connection_factory(settings)

    try:
        factory()
    except ValueError as exc:
        assert str(exc) == "Database URL is not configured."
    else:
        raise AssertionError("Expected ValueError when database URL is missing.")


def test_create_connection_factory_uses_dict_row_factory(monkeypatch):
    captured = {}

    def fake_connect(database_url, row_factory):
        captured["database_url"] = database_url
        captured["row_factory"] = row_factory
        return object()

    fake_dict_row = object()
    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows_module = types.SimpleNamespace(dict_row=fake_dict_row)

    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows_module)

    settings = Settings(databaseUrl="postgresql://worker:worker@localhost:5432/pv_fusion")
    factory = create_connection_factory(settings)
    factory()

    assert captured["database_url"] == "postgresql://worker:worker@localhost:5432/pv_fusion"
    assert captured["row_factory"] is fake_dict_row
