import logging
import time
from collections.abc import Callable
from typing import Any

from app.config.settings import Settings

_logger = logging.getLogger(__name__)

# DB 연결·쿼리 타임아웃 상수
# psycopg.connect() 가 반환되기까지 기다리는 최대 시간 (초)
_CONNECT_TIMEOUT_SECONDS = 10
# 단일 SQL 실행 최대 시간 (ms). 초과 시 PostgreSQL 이 cancellation 을 보낸다.
_STATEMENT_TIMEOUT_MS = 30_000
# 행 잠금 획득 최대 대기 시간 (ms).
_LOCK_TIMEOUT_MS = 5_000
# 트랜잭션 내 유휴 세션 최대 허용 시간 (ms). 연결이 트랜잭션을 잡고 방치되는 것을 막는다.
_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS = 30_000


def create_connection_factory(settings: Settings) -> Callable[[], Any]:
    """
    각 호출마다 새 DB 연결을 열고 블록 종료 후 반드시 닫는 컨텍스트 매니저를 반환한다.

    반환된 factory() 를 with 문으로 사용하면:
      - __enter__: psycopg.connect() 로 연결을 열고 연결 객체를 반환한다.
      - __exit__:  예외 발생 시 rollback → 항상 close() 를 호출한다.

    psycopg Connection 자체를 with 문으로 쓰면 commit/rollback 만 관리하고
    close() 를 호출하지 않아 connection leak 이 발생한다.
    이 factory 는 _ClosingConnectionContext 를 통해 그 문제를 해결한다.
    """

    def factory() -> "_ClosingConnectionContext":
        database_url = settings.databaseUrl.strip()
        if not database_url:
            raise ValueError("Database URL is not configured.")

        try:
            import psycopg
            from psycopg.rows import dict_row
        except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
            raise ModuleNotFoundError(
                "psycopg is required to create a PostgreSQL connection."
            ) from exc

        return _ClosingConnectionContext(
            database_url=database_url,
            row_factory=dict_row,
            connect_timeout=_CONNECT_TIMEOUT_SECONDS,
            options=(
                f"-c statement_timeout={_STATEMENT_TIMEOUT_MS}"
                f" -c lock_timeout={_LOCK_TIMEOUT_MS}"
                f" -c idle_in_transaction_session_timeout={_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS}"
            ),
            psycopg_connect=psycopg.connect,
        )

    return factory


class _ClosingConnectionContext:
    """
    psycopg Connection 을 열고 블록 종료 시 항상 close() 를 보장하는 컨텍스트 매니저.

    설계 원칙:
    - commit 은 repository 가 직접 호출한다 (선택적 트랜잭션).
    - 예외 발생 시: rollback → close
    - 정상 종료 시: close (commit 되지 않은 트랜잭션은 암묵 rollback)
    - rollback/close 자체가 실패해도 예외를 삼키고 원래 예외를 전파한다.
    """

    __slots__ = (
        "_database_url",
        "_row_factory",
        "_connect_timeout",
        "_options",
        "_psycopg_connect",
        "_conn",
    )

    def __init__(
        self,
        database_url: str,
        *,
        row_factory: Any,
        connect_timeout: int,
        options: str,
        psycopg_connect: Any,
    ) -> None:
        self._database_url = database_url
        self._row_factory = row_factory
        self._connect_timeout = connect_timeout
        self._options = options
        self._psycopg_connect = psycopg_connect
        self._conn: Any = None

    def __enter__(self) -> Any:
        t0 = time.perf_counter()
        self._conn = self._psycopg_connect(
            self._database_url,
            row_factory=self._row_factory,
            connect_timeout=self._connect_timeout,
            options=self._options,
        )
        _logger.debug(
            "db.conn.acquired elapsedMs=%s",
            int((time.perf_counter() - t0) * 1000),
        )
        return self._conn

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if self._conn is None:
            return
        try:
            if exc_type is not None:
                try:
                    self._conn.rollback()
                    _logger.debug("db.conn.rollback.after reason=%s", exc_type.__name__)
                except Exception:
                    _logger.debug("db.conn.rollback.failed — ignoring during connection close")
        finally:
            try:
                self._conn.close()
                _logger.debug("db.conn.released")
            except Exception:
                _logger.debug("db.conn.close.failed — ignoring")
