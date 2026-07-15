from datetime import datetime, timezone
from decimal import Decimal

from app.domain.analysis_result import AnalysisResultDraft
from app.domain.detected_defect import DetectedDefectDraft
from app.domain.enums import ActionCandidate, ModelType, ResultStatus
from app.infrastructure.db.result_repository import PostgresResultRepository


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


def build_result_draft() -> AnalysisResultDraft:
    return AnalysisResultDraft(
        analysisJobId=1000,
        modelType=ModelType.RGB_ONLY,
        modelName="pv-rgb",
        modelVersion="v1.0.0",
        modelFormat="onnx",
        runtime="onnxruntime",
        inputSize=640,
        threshold=Decimal("0.50"),
        resultStatus=ResultStatus.ANOMALY,
        anomalyCount=1,
        maxConfidence=Decimal("0.90"),
        areaRatio=Decimal("0.20"),
        severityScore=Decimal("0.70"),
        actionCandidate=ActionCandidate.CLEANING,
        bboxBucketName="images",
        bboxObjectKey="analysis-results/1000/bbox_overlay.png",
        bboxFileUrl=None,
        heatmapBucketName=None,
        heatmapObjectKey=None,
        heatmapFileUrl=None,
        maskBucketName=None,
        maskObjectKey=None,
        maskFileUrl=None,
        analyzedAt=datetime(2026, 6, 8, 0, 0, tzinfo=timezone.utc),
    )


def build_defect() -> DetectedDefectDraft:
    return DetectedDefectDraft(
        defectType="UNKNOWN",
        defectSource="THERMAL",
        confidence=Decimal("0.91"),
        areaRatio=None,
        bboxX=10,
        bboxY=20,
        bboxWidth=30,
        bboxHeight=40,
        maskBucketName=None,
        maskObjectKey=None,
        maskFileUrl=None,
        severityScore=None,
        actionCandidate=ActionCandidate.CLEANING,
        modelClassId=None,
        modelClassName=None,
    )


def test_save_result_inserts_analysis_result_and_returns_id():
    cursor = FakeCursor(fetchone_result={"id": 321})
    connection = FakeConnection(cursor)
    repository = PostgresResultRepository(lambda: connection)

    result_id = repository.save_result(build_result_draft())

    assert result_id == 321
    query, params = cursor.executed[0]
    assert "INSERT INTO analysis_results" in query
    assert params[0] == 1000
    assert params[13] == "LOW"
    assert params[15] == "LOW"
    assert params[16] == "UNCHECKED"
    assert params[17] == "images"
    assert params[18] == "analysis-results/1000/bbox_overlay.png"
    assert params[23] is None
    assert params[24] is None
    assert connection.committed is True


def test_save_result_includes_mask_columns_when_present():
    cursor = FakeCursor(fetchone_result={"id": 321})
    connection = FakeConnection(cursor)
    repository = PostgresResultRepository(lambda: connection)
    result = build_result_draft().model_copy(
        update={
            "maskBucketName": "images",
            "maskObjectKey": "analysis-results/1000/mask_overlay.png",
        }
    )

    repository.save_result(result)

    _, params = cursor.executed[0]
    assert params[23] == "images"
    assert params[24] == "analysis-results/1000/mask_overlay.png"


def test_save_defects_inserts_each_defect():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresResultRepository(lambda: connection)

    repository.save_defects(321, [build_defect(), build_defect()])

    assert len(cursor.executed) == 2
    query, params = cursor.executed[0]
    assert "INSERT INTO detected_defects" in query
    assert params[0] == 321
    assert params[1] == "UNKNOWN"
    assert params[2] == "THERMAL"
    assert params[13] == "LOW"
    assert params[14] == "CLEANING"
    assert params[15] is None
    assert params[16] is None
    assert connection.committed is True


def test_save_defects_includes_model_class_columns_when_present():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresResultRepository(lambda: connection)
    defect = build_defect().model_copy(
        update={
            "modelClassId": 3,
            "modelClassName": "missing",
        }
    )

    repository.save_defects(321, [defect])

    _, params = cursor.executed[0]
    assert params[15] == 3
    assert params[16] == "missing"


def test_save_defects_skips_db_call_when_defects_are_empty():
    cursor = FakeCursor()
    connection = FakeConnection(cursor)
    repository = PostgresResultRepository(lambda: connection)

    repository.save_defects(321, [])

    assert cursor.executed == []
    assert connection.committed is False


def test_save_completed_result_commits_result_defects_and_job_success_together():
    cursor = FakeCursor(fetchone_result={"id": 321})
    connection = FakeConnection(cursor)
    repository = PostgresResultRepository(lambda: connection)

    result_id = repository.save_completed_result(build_result_draft(), [build_defect(), build_defect()])

    assert result_id == 321
    assert len(cursor.executed) == 4
    assert "INSERT INTO analysis_results" in cursor.executed[0][0]
    assert "INSERT INTO detected_defects" in cursor.executed[1][0]
    assert "INSERT INTO detected_defects" in cursor.executed[2][0]
    assert "UPDATE analysis_jobs" in cursor.executed[3][0]
    assert cursor.executed[3][1][0] == "SUCCEEDED"
    assert cursor.executed[3][1][1] == 1000
    assert cursor.executed[3][1][2] == "RUNNING"
    assert connection.committed is True
