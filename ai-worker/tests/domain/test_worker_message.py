from datetime import datetime

import pytest
from pydantic import ValidationError

from app.domain.analysis_result import AnalysisResultDraft
from app.domain.enums import ActionCandidate, ModelType, ResultStatus
from app.domain.worker_message import WorkerMessage


def build_message(**overrides):
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
    return payload


def test_rgb_single_message_is_valid():
    message = WorkerMessage(**build_message())

    assert message.inputType.value == "RGB_SINGLE"
    assert message.imageId == 201


def test_thermal_single_message_is_valid():
    message = WorkerMessage(**build_message(inputType="THERMAL_SINGLE", requestedModelType="THERMAL_ONLY"))

    assert message.inputType.value == "THERMAL_SINGLE"
    assert message.imageId == 201


def test_backend_legacy_image_pair_id_null_is_ignored():
    message = WorkerMessage(**build_message(imagePairId=None))

    assert message.imageId == 201
    assert not hasattr(message, "imagePairId")


def test_image_id_is_required():
    with pytest.raises(ValidationError):
        WorkerMessage(**build_message(imageId=None))


def test_blank_trace_id_fails():
    with pytest.raises(ValidationError):
        WorkerMessage(**build_message(traceId="   "))


def test_null_created_at_is_normalized():
    message = WorkerMessage(**build_message(createdAt=None))

    assert message.createdAt is not None


def test_rgb_and_thermal_model_type_mismatch_fails():
    with pytest.raises(ValidationError):
        WorkerMessage(**build_message(requestedModelType="THERMAL_ONLY"))


def test_pair_input_is_rejected():
    with pytest.raises(ValidationError):
        WorkerMessage(
            **build_message(
                inputType="RGB_THERMAL_PAIR",
                requestedModelType="RGB_ONLY",
            )
        )


def test_fusion_requested_model_type_is_rejected():
    with pytest.raises(ValidationError):
        WorkerMessage(**build_message(requestedModelType="FUSION_AUTO"))


def test_result_status_failed_is_not_allowed():
    with pytest.raises(ValueError):
        ResultStatus("FAILED")


def test_analysis_result_draft_accepts_backend_result_status_only():
    draft = AnalysisResultDraft(
        analysisJobId=1000,
        modelType=ModelType.RGB_ONLY,
        modelName="pv-rgb",
        modelVersion="v1.0.0",
        modelFormat="onnx",
        runtime="onnxruntime",
        inputSize=640,
        threshold="0.5",
        resultStatus=ResultStatus.ANOMALY,
        anomalyCount=1,
        severityScore="0.7",
        actionCandidate=ActionCandidate.FIELD_INSPECTION,
        analyzedAt=datetime.fromisoformat("2026-06-07T10:00:00+09:00"),
    )

    assert draft.resultStatus is ResultStatus.ANOMALY
