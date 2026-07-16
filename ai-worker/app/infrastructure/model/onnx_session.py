from collections.abc import Callable
from pathlib import Path
from typing import Any


class OnnxSessionProvider:
    def __init__(self, session_factory: Callable[[str], Any] | None = None) -> None:
        self._session_factory = session_factory or self._build_session
        self._sessions: dict[str, Any] = {}

    def get_session(self, model_path: str) -> Any:
        normalized_path = model_path.strip()
        if not normalized_path:
            raise ValueError("Model path is not configured.")
        if normalized_path not in self._sessions:
            path = Path(normalized_path)
            if not path.exists():
                raise FileNotFoundError(f"ONNX model file was not found: {normalized_path}")
            self._sessions[normalized_path] = self._session_factory(normalized_path)
        return self._sessions[normalized_path]

    @staticmethod
    def _build_session(model_path: str) -> Any:
        try:
            import onnxruntime as ort
        except ModuleNotFoundError as exc:  # pragma: no cover - environment dependent
            raise ModuleNotFoundError("onnxruntime is required to create an inference session.") from exc

        return ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
