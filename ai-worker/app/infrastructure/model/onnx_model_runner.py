from app.application.ports import ModelRunnerPort
from app.domain.enums import InputType
from app.domain.image_input import SingleImageInput
from app.domain.model import ModelInfo
from app.infrastructure.model.model_registry import ModelRegistry
from app.infrastructure.model.onnx_session import OnnxSessionProvider
from app.infrastructure.model.output_parser import parse_inference_output
from app.infrastructure.model.preprocess import preprocess_image_bytes


class OnnxModelRunner(ModelRunnerPort):
    def __init__(
        self,
        model_registry: ModelRegistry,
        session_provider: OnnxSessionProvider,
        preprocess=preprocess_image_bytes,
        output_parser=parse_inference_output,
    ) -> None:
        self._model_registry = model_registry
        self._session_provider = session_provider
        self._preprocess = preprocess
        self._output_parser = output_parser

    def run(
        self,
        input_data: SingleImageInput,
        model_info: ModelInfo,
        image_bytes: bytes,
    ):
        resolved_model = self._model_registry.resolve(
            self._resolve_input_type(input_data),
            model_info.requestedModelType,
        )
        session = self._session_provider.get_session(resolved_model.modelPath)
        tensor = self._preprocess(image_bytes, resolved_model.inputSize)
        raw_output = self._run_session(session, tensor)
        return self._output_parser(raw_output, resolved_model)

    @staticmethod
    def _resolve_input_type(input_data: SingleImageInput) -> InputType:
        if input_data.imageType == "THERMAL":
            return InputType.THERMAL_SINGLE
        return InputType.RGB_SINGLE

    @staticmethod
    def _run_session(session, tensor):
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: tensor})
        if len(outputs) == 1:
            return outputs[0]
        return outputs
