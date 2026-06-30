from enum import Enum


class StrEnum(str, Enum):
    """String enum base for JSON-friendly domain values."""


class InputType(StrEnum):
    RGB_SINGLE = "RGB_SINGLE"
    THERMAL_SINGLE = "THERMAL_SINGLE"


class ModelType(StrEnum):
    RGB_ONLY = "RGB_ONLY"
    THERMAL_ONLY = "THERMAL_ONLY"


class RequestedModelType(StrEnum):
    RGB_ONLY = "RGB_ONLY"
    THERMAL_ONLY = "THERMAL_ONLY"


class JobStatus(StrEnum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class ResultStatus(StrEnum):
    NORMAL = "NORMAL"
    ANOMALY = "ANOMALY"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"


class ActionCandidate(StrEnum):
    CLEANING = "CLEANING"
    RETAKE = "RETAKE"
    FIELD_INSPECTION = "FIELD_INSPECTION"
    REPLACEMENT_REVIEW = "REPLACEMENT_REVIEW"
