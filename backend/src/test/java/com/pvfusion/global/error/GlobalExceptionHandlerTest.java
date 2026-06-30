package com.pvfusion.global.error;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.MDC;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("BE-UNIT-ERR-001 도메인 예외는 공통 오류 응답으로 매핑된다")
    void handleBusinessExceptionBuildsStandardErrorResponse() {
        MDC.put("traceId", "trace-123");
        HttpServletRequest request = request("/api/v1/plants/10");

        ResponseEntity<ErrorResponse> response = handler.handleBusinessException(
                new ForbiddenException("접근할 수 없습니다."),
                request
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().success()).isFalse();
        assertThat(response.getBody().error().code()).isEqualTo(ErrorCode.FORBIDDEN.getCode());
        assertThat(response.getBody().error().message()).isEqualTo(ErrorCode.FORBIDDEN.getDefaultMessage());
        assertThat(response.getBody().error().detail()).isEqualTo("접근할 수 없습니다.");
        assertThat(response.getBody().error().path()).isEqualTo("/api/v1/plants/10");
        assertThat(response.getBody().error().traceId()).isEqualTo("trace-123");
    }

    @Test
    @DisplayName("BE-UNIT-ERR-001 Validation 예외는 필드 오류 상세를 포함한다")
    void handleMethodArgumentNotValidExceptionIncludesFieldErrors() throws Exception {
        HttpServletRequest request = request("/api/v1/zones");
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(Map.of(), "createZoneRequest");
        bindingResult.addError(new FieldError("createZoneRequest", "name", "must not be blank"));
        bindingResult.addError(new FieldError("createZoneRequest", "plantId", "must not be null"));
        MethodParameter methodParameter = new MethodParameter(
                TestController.class.getDeclaredMethod("create", String.class),
                0
        );

        ResponseEntity<ErrorResponse> response = handler.handleMethodArgumentNotValidException(
                new MethodArgumentNotValidException(methodParameter, bindingResult),
                request
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error().code()).isEqualTo(ErrorCode.INVALID_INPUT.getCode());
        assertThat(response.getBody().error().detail()).contains("name: must not be blank");
        assertThat(response.getBody().error().detail()).contains("plantId: must not be null");
        assertThat(response.getBody().error().path()).isEqualTo("/api/v1/zones");
        assertThat(response.getBody().error().traceId()).isNotBlank();
    }

    @Test
    @DisplayName("BE-UNIT-ERR-001 미처리 예외는 INTERNAL_SERVER_ERROR로 변환된다")
    void handleExceptionBuildsInternalServerErrorResponse() {
        HttpServletRequest request = request("/api/v1/images/preview");

        ResponseEntity<ErrorResponse> response = handler.handleException(
                new IllegalStateException("unexpected"),
                request
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error().code()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.getCode());
        assertThat(response.getBody().error().message()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage());
        assertThat(response.getBody().error().detail()).isNull();
        assertThat(response.getBody().error().path()).isEqualTo("/api/v1/images/preview");
        assertThat(response.getBody().error().traceId()).isNotBlank();
    }

    private HttpServletRequest request(String uri) {
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        Mockito.when(request.getRequestURI()).thenReturn(uri);
        return request;
    }

    @SuppressWarnings("unused")
    private static final class TestController {
        void create(String value) {
        }
    }
}
