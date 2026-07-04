package com.pvfusion.global.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "입력값 검증에 실패했습니다."),
    INVALID_FILE_FORMAT(HttpStatus.BAD_REQUEST, "INVALID_FILE_FORMAT", "지원하지 않는 파일 형식입니다."),
    FILE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "FILE_SIZE_EXCEEDED", "허용 가능한 파일 크기를 초과했습니다."),
    IMAGE_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "IMAGE_VALIDATION_FAILED", "이미지 검증에 실패했습니다."),
    PAIR_CONDITION_MISMATCH(HttpStatus.BAD_REQUEST, "PAIR_CONDITION_MISMATCH", "Pair 생성 조건이 일치하지 않습니다."),
    INVALID_ANALYSIS_TARGET(HttpStatus.BAD_REQUEST, "INVALID_ANALYSIS_TARGET", "분석 대상이 유효하지 않습니다."),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요합니다."),

    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."),
    APPROVAL_REQUIRED(HttpStatus.FORBIDDEN, "APPROVAL_REQUIRED", "승인 대기 상태의 사용자입니다."),
    USER_DEACTIVATED(HttpStatus.FORBIDDEN, "USER_DEACTIVATED", "비활성화된 사용자입니다."),

    NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다."),
    VISUALIZATION_NOT_FOUND(HttpStatus.NOT_FOUND, "VISUALIZATION_NOT_FOUND", "요청한 시각화 결과를 찾을 수 없습니다."),
    STORAGE_OBJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "STORAGE_OBJECT_NOT_FOUND", "저장소 객체를 찾을 수 없습니다."),

    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", "중복된 리소스입니다."),
    DUPLICATE_IMAGE_UPLOAD(HttpStatus.CONFLICT, "DUPLICATE_IMAGE_UPLOAD", "같은 작업에 동일한 파일명이 이미 업로드되어 있습니다."),
    PAIR_ALREADY_EXISTS(HttpStatus.CONFLICT, "PAIR_ALREADY_EXISTS", "이미 Pair가 존재합니다."),
    ANALYSIS_JOB_ALREADY_RUNNING(HttpStatus.CONFLICT, "ANALYSIS_JOB_ALREADY_RUNNING", "동일 대상 분석 작업이 이미 진행 중입니다."),

    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_UPLOAD_FAILED", "파일 업로드 처리에 실패했습니다."),
    FILE_STORAGE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_STORAGE_FAILED", "파일 저장에 실패했습니다."),
    ANALYSIS_JOB_CREATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "ANALYSIS_JOB_CREATION_FAILED", "분석 작업 생성에 실패했습니다."),
    AI_INFERENCE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI_INFERENCE_FAILED", "AI 추론에 실패했습니다."),
    DATABASE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "DATABASE_ERROR", "데이터 처리 중 오류가 발생했습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."),

    QUEUE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "QUEUE_UNAVAILABLE", "Queue를 사용할 수 없습니다."),
    AI_WORKER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI_WORKER_UNAVAILABLE", "AI Worker를 사용할 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String defaultMessage;

    ErrorCode(HttpStatus httpStatus, String code, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
