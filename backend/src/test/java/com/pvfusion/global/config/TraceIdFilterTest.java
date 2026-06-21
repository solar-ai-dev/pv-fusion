package com.pvfusion.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TraceIdFilterTest {

    private final TraceIdFilter filter = new TraceIdFilter();

    @BeforeEach
    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void preservesIncomingTraceIdAndAddsItToResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/dashboard");
        request.addHeader(TraceIdFilter.TRACE_HEADER_NAME, "trace-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> traceIdInChain = new AtomicReference<>();

        filter.doFilter(request, response, (req, res) -> traceIdInChain.set(MDC.get(TraceIdFilter.TRACE_ID_KEY)));

        assertThat(traceIdInChain.get()).isEqualTo("trace-123");
        assertThat(response.getHeader(TraceIdFilter.TRACE_HEADER_NAME)).isEqualTo("trace-123");
        assertThat(MDC.get(TraceIdFilter.TRACE_ID_KEY)).isNull();
    }

    @Test
    void generatesTraceIdWhenHeaderIsMissing() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/dashboard");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> traceIdInChain = new AtomicReference<>();

        filter.doFilter(request, response, (req, res) -> traceIdInChain.set(MDC.get(TraceIdFilter.TRACE_ID_KEY)));

        assertThat(traceIdInChain.get()).isNotBlank();
        assertThat(response.getHeader(TraceIdFilter.TRACE_HEADER_NAME)).isEqualTo(traceIdInChain.get());
        assertThat(MDC.get(TraceIdFilter.TRACE_ID_KEY)).isNull();
    }
}
