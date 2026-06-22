package com.pvfusion.global.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TraceIdFilter extends OncePerRequestFilter {

    static final String TRACE_ID_KEY = "traceId";
    static final String TRACE_HEADER_NAME = "X-Trace-Id";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String previousTraceId = MDC.get(TRACE_ID_KEY);
        String traceId = resolveTraceId(request.getHeader(TRACE_HEADER_NAME));

        MDC.put(TRACE_ID_KEY, traceId);
        response.setHeader(TRACE_HEADER_NAME, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (previousTraceId != null && !previousTraceId.isBlank()) {
                MDC.put(TRACE_ID_KEY, previousTraceId);
            } else {
                MDC.remove(TRACE_ID_KEY);
            }
        }
    }

    private String resolveTraceId(String requestTraceId) {
        if (requestTraceId != null && !requestTraceId.isBlank()) {
            return requestTraceId.trim();
        }
        return UUID.randomUUID().toString();
    }
}
