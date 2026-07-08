import sys
import types

from app.config.settings import Settings
from app.application.errors import JobStateTransitionError
from app.infrastructure.db.analysis_job_repository import PostgresAnalysisJobRepository
from app.infrastructure.db.session import create_connection_factory


# ---------------------------------------------------------------------------
# Shared fakes
# ---------------------------------------------------------------------------

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
    """
    repository 단위 테스트용 가짜 connection.

    close / rollback 호출 여부를 추적해 lifecycle 검증에 사용한다.
    실제 psycopg.Connection 처럼 with 문으로 사용하면 __enter__ 가 self 를 반환한다.
    """

    def __init__(self, cursor: FakeCursor):
        self._cursor = cursor
        self.committed = False
        self.closed = False
        self.rolled_back = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


# ---------------------------------------------------------------------------
# get_by_id
# ---------------------------------------------------------------------------

def test_get_by_id_maps_row_to_analysis_job():
    from datetime import datetime, timezone

    started = datetime(2026, 7, 5, 10, 0, 0, tzinfo=timezone.utc)
    updated = datetime(2026, 7, 5, 10, 5, 0, tzinfo=timezone.utc)
    cursor = FakeCursor(
        fetchone_result={
            "id": 1000,
            "image_id": 201,
            "input_type": "RGB_SINGLE",
            "requested_model_type": "RGB_ONLY",
            "model_type": "RGB_ONLY",
            "job_status": "QUEUED",
            "requested_by_user_id": 1,
            "trace_id": "req-1",
            "failure_code": None,
            "failure_message": None,
            "started_at": started,
            "updated_at": updated,
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
    assert job.startedAt == started
    assert job.updatedAt == updated


def test_get_by_id_maps_null_timestamps():
    """started_at / updated_at 이 NULL인 경우 None 으로 매핑되어야 한다."""
    cursor = FakeCursor(
        fetchone_result={
            "id": 2000,
            "image_id": 301,
            "input_type": "THERMAL_SINGLE",
            "requested_model_type": "THERMAL_ONLY",
            "model_type": None,
            "job_status": "QUEUED",
            "requested_by_user_id": 2,
            "trace_id": "req-2",
            "failure_code": None,
            "failure_message": None,
            "started_at": None,
            "updated_at": None,
        }
    )
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(cursor))

    job = repository.get_by_id(2000)

    assert job is not None
    assert job.startedAt is None
    assert job.updatedAt is None


def test_get_by_id_query_includes_started_at_and_updated_at():
    """get_by_id 쿼리가 started_at, updated_at 컬럼을 SELECT 해야 한다."""
    cursor = FakeCursor(
        fetchone_result={
            "id": 1000,
            "image_id": 201,
            "input_type": "RGB_SINGLE",
            "requested_model_type": "RGB_ONLY",
            "model_type": None,
            "job_status": "QUEUED",
            "requested_by_user_id": 1,
            "trace_id": "req-1",
            "failure_code": None,
            "failure_message": None,
            "started_at": None,
            "updated_at": None,
        }
    )
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(cursor))

    repository.get_by_id(1000)

    query, _ = cursor.executed[0]
    assert "started_at" in query
    assert "updated_at" in query


def test_get_by_id_returns_none_when_row_is_missing():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(fetchone_result=None)))

    job = repository.get_by_id(9999)

    assert job is None


# ---------------------------------------------------------------------------
# mark_running
# ---------------------------------------------------------------------------

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


def test_mark_running_raises_when_conditional_update_affects_no_rows():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(rowcount=0)))

    try:
        repository.mark_running(1000)
    except JobStateTransitionError as exc:
        assert str(exc) == "Job could not transition to RUNNING."
    else:
        raise AssertionError("Expected JobStateTransitionError for mark_running.")


# ---------------------------------------------------------------------------
# mark_succeeded
# ---------------------------------------------------------------------------

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


def test_mark_succeeded_raises_when_conditional_update_affects_no_rows():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(rowcount=0)))

    try:
        repository.mark_succeeded(1000)
    except JobStateTransitionError as exc:
        assert str(exc) == "Job could not transition to SUCCEEDED."
    else:
        raise AssertionError("Expected JobStateTransitionError for mark_succeeded.")


# ---------------------------------------------------------------------------
# mark_failed
# ---------------------------------------------------------------------------

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


def test_mark_failed_raises_when_conditional_update_affects_no_rows():
    repository = PostgresAnalysisJobRepository(lambda: FakeConnection(FakeCursor(rowcount=0)))

    try:
        repository.mark_failed(1000, "QUEUE_UNAVAILABLE", "queue unavailable")
    except JobStateTransitionError as exc:
        assert str(exc) == "Job could not transition to FAILED."
    else:
        raise AssertionError("Expected JobStateTransitionError for mark_failed.")


# ---------------------------------------------------------------------------
# connection lifecycle: mark_running 이 JobStateTransitionError 를 raise 해도
# connection 이 누적되지 않는지 factory 호출 횟수로 검증
# ---------------------------------------------------------------------------

def test_mark_running_calls_factory_exactly_once():
    """mark_running 을 1회 호출하면 factory 도 1회 호출돼야 한다."""
    call_count = [0]

    def counting_factory():
        call_count[0] += 1
        return FakeConnection(FakeCursor())

    repository = PostgresAnalysisJobRepository(counting_factory)
    repository.mark_running(1)

    assert call_count[0] == 1


def test_get_by_id_calls_factory_exactly_once():
    call_count = [0]
    row = {
        "id": 1, "image_id": 1, "input_type": "RGB_SINGLE",
        "requested_model_type": "RGB_ONLY", "model_type": None,
        "job_status": "QUEUED", "requested_by_user_id": 1,
        "trace_id": "t", "failure_code": None, "failure_message": None,
        "started_at": None, "updated_at": None,
    }

    def counting_factory():
        call_count[0] += 1
        return FakeConnection(FakeCursor(fetchone_result=row))

    repository = PostgresAnalysisJobRepository(counting_factory)
    repository.get_by_id(1)

    assert call_count[0] == 1


def test_sequential_calls_use_independent_connections():
    """get_by_id → mark_running 순서로 호출해도 factory 가 각각 1회씩 호출돼야 한다."""
    call_count = [0]
    row = {
        "id": 5, "image_id": 1, "input_type": "RGB_SINGLE",
        "requested_model_type": "RGB_ONLY", "model_type": None,
        "job_status": "QUEUED", "requested_by_user_id": 1,
        "trace_id": "t", "failure_code": None, "failure_message": None,
        "started_at": None, "updated_at": None,
    }

    def counting_factory():
        call_count[0] += 1
        return FakeConnection(FakeCursor(fetchone_result=row))

    repository = PostgresAnalysisJobRepository(counting_factory)
    repository.get_by_id(5)   # call 1
    repository.mark_running(5)  # call 2

    assert call_count[0] == 2


# ---------------------------------------------------------------------------
# create_connection_factory — session.py 단위 테스트
# ---------------------------------------------------------------------------

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
    """factory() 가 반환한 컨텍스트 매니저를 열면 dict_row 로 connect 해야 한다."""
    captured = {}

    class FakeConn:
        def close(self):
            pass

        def rollback(self):
            pass

    def fake_connect(database_url, *, row_factory, connect_timeout, options):
        captured["database_url"] = database_url
        captured["row_factory"] = row_factory
        return FakeConn()

    fake_dict_row = object()
    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows_module = types.SimpleNamespace(dict_row=fake_dict_row)

    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows_module)

    settings = Settings(databaseUrl="postgresql://worker:worker@localhost:5432/pv_fusion")
    factory = create_connection_factory(settings)

    with factory() as conn:  # __enter__ 에서 fake_connect 호출
        assert isinstance(conn, FakeConn)

    assert captured["database_url"] == "postgresql://worker:worker@localhost:5432/pv_fusion"
    assert captured["row_factory"] is fake_dict_row


def test_connection_factory_closes_connection_after_normal_exit(monkeypatch):
    """블록이 정상 종료되면 connection.close() 가 호출돼야 한다."""
    closed = []

    class FakeConn:
        def close(self):
            closed.append(True)

        def rollback(self):
            pass

    def fake_connect(database_url, *, row_factory, connect_timeout, options):
        return FakeConn()

    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows_module = types.SimpleNamespace(dict_row=object())
    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows_module)

    settings = Settings(databaseUrl="postgresql://w:w@localhost/db")
    factory = create_connection_factory(settings)

    with factory():
        pass

    assert closed == [True], "connection.close() 는 정상 종료 후 반드시 1회 호출돼야 한다."


def test_connection_factory_closes_connection_on_exception(monkeypatch):
    """블록 내 예외가 발생해도 rollback → close 가 호출돼야 한다."""
    events = []

    class FakeConn:
        def rollback(self):
            events.append("rollback")

        def close(self):
            events.append("close")

    def fake_connect(database_url, *, row_factory, connect_timeout, options):
        return FakeConn()

    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows_module = types.SimpleNamespace(dict_row=object())
    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows_module)

    settings = Settings(databaseUrl="postgresql://w:w@localhost/db")
    factory = create_connection_factory(settings)

    try:
        with factory():
            raise RuntimeError("simulated db error")
    except RuntimeError:
        pass

    assert "rollback" in events, "예외 발생 시 rollback 이 호출돼야 한다."
    assert "close" in events, "예외 발생 시에도 close 가 호출돼야 한다."
    assert events.index("rollback") < events.index("close"), "rollback 이 close 보다 먼저 호출돼야 한다."


def test_connection_factory_passes_connect_timeout(monkeypatch):
    """factory 가 connect_timeout 을 psycopg.connect 에 전달해야 한다."""
    captured = {}

    class FakeConn:
        def close(self): pass
        def rollback(self): pass

    def fake_connect(database_url, *, row_factory, connect_timeout, options):
        captured["connect_timeout"] = connect_timeout
        return FakeConn()

    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows_module = types.SimpleNamespace(dict_row=object())
    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows_module)

    settings = Settings(databaseUrl="postgresql://w:w@localhost/db")
    factory = create_connection_factory(settings)

    with factory():
        pass

    assert captured["connect_timeout"] == 10


def test_connection_factory_passes_statement_timeout_in_options(monkeypatch):
    """factory 가 options 에 statement_timeout 을 포함해 전달해야 한다."""
    captured = {}

    class FakeConn:
        def close(self): pass
        def rollback(self): pass

    def fake_connect(database_url, *, row_factory, connect_timeout, options):
        captured["options"] = options
        return FakeConn()

    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows_module = types.SimpleNamespace(dict_row=object())
    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows_module)

    settings = Settings(databaseUrl="postgresql://w:w@localhost/db")
    factory = create_connection_factory(settings)

    with factory():
        pass

    assert "statement_timeout" in captured["options"]
    assert "lock_timeout" in captured["options"]
    assert "idle_in_transaction_session_timeout" in captured["options"]


def test_mark_running_db_exception_does_not_prevent_connection_close(monkeypatch):
    """
    mark_running 중 DB 예외가 발생해도 connection 은 닫혀야 한다.

    create_connection_factory 가 반환한 _ClosingConnectionContext 를 통해
    rollback → close 순서로 호출되는지 검증한다.
    이것이 connection leak 방지의 핵심 검증이다.
    """
    import types

    closed = []
    rolled_back = []

    class FakeConn:
        def cursor(self):
            return _ExplodingCursor()

        def rollback(self):
            rolled_back.append(True)

        def close(self):
            closed.append(True)

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

    class _ExplodingCursor:
        rowcount = 1

        def execute(self, query, params):
            raise OSError("simulated network failure")

        def fetchone(self):
            return None

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

    def fake_connect(database_url, *, row_factory, connect_timeout, options):
        return FakeConn()

    fake_psycopg = types.SimpleNamespace(connect=fake_connect)
    fake_rows = types.SimpleNamespace(dict_row=object())
    monkeypatch.setitem(sys.modules, "psycopg", fake_psycopg)
    monkeypatch.setitem(sys.modules, "psycopg.rows", fake_rows)

    settings = Settings(databaseUrl="postgresql://w:w@localhost/db")
    factory = create_connection_factory(settings)
    repository = PostgresAnalysisJobRepository(factory)

    try:
        repository.mark_running(99)
    except OSError:
        pass

    assert rolled_back == [True], "DB 예외 시 rollback 이 1회 호출돼야 한다."
    assert closed == [True], "DB 예외 후에도 connection.close() 는 1회 호출돼야 한다."
