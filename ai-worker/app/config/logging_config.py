import logging
import sys


def configure_logging() -> None:
    """
    AI Worker 앱 로거를 초기화한다.

    uvicorn은 자체 LOGGING_CONFIG 에서 root logger 레벨을 WARNING 으로 설정하고
    uvicorn.* 로거에만 핸들러를 추가한다. 그 결과 app.* 로거는 핸들러가 없어
    logger.info 출력이 콘솔에 나타나지 않는다.

    이 함수는 main.py 모듈 임포트 시점(uvicorn dictConfig 직후)에 호출되어
    root logger 에 StreamHandler 를 추가하고 레벨을 INFO 로 올린다.
    uvicorn LOGGING_CONFIG 에는 disable_existing_loggers=False 가 있으므로
    여기서 추가한 핸들러는 uvicorn 재설정 이후에도 제거되지 않는다.
    """
    root = logging.getLogger()

    # 이미 StreamHandler 가 있으면 레벨만 INFO 로 조정하고 반환한다.
    has_stream_handler = any(isinstance(h, logging.StreamHandler) for h in root.handlers)
    if has_stream_handler:
        root.setLevel(logging.INFO)
        for handler in root.handlers:
            if isinstance(handler, logging.StreamHandler):
                handler.setLevel(logging.INFO)
        return

    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(logging.INFO)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(levelname)-8s %(name)s - %(message)s",
        )
    )
    root.addHandler(handler)
    root.setLevel(logging.INFO)
