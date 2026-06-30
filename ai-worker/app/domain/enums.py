from enum import Enum


class StrEnum(str, Enum):
    """String enum base for JSON-friendly domain values."""


class InputType(StrEnum):
    RGB_SINGLE = "RGB_SINGLE"
    THERMAL_SINGLE = "THERMAL_SINGLE"
    RGB_THERMAL_PAIR = "RGB_THERMAL_PAIR"


class ModelType(StrEnum):
    RGB_ONLY = "RGB_ONLY"
    THERMAL_ONLY = "THERMAL_ONLY"
    FUSION = "FUSION"


class RequestedModelType(StrEnum):
    AUTO = "AUTO"
    RGB_ONLY = "RGB_ONLY"
    THERMAL_ONLY = "THERMAL_ONLY"
    FUSION_AUTO = "FUSION_AUTO"
    EARLY_FUSION = "EARLY_FUSION"
    LATE_FUSION = "LATE_FUSION"


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
