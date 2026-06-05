package com.pvfusion.adapter.out.queue;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.analysis.AnalysisJobMessage;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.RequestedModelType;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sqs.SqsClient;

@ExtendWith(MockitoExtension.class)
class SqsAnalysisJobPublisherAdapterTest {

    @Mock
    private SqsClient sqsClient;

    @Test
    void publishSendsMessageToQueue() {
        SqsAnalysisJobPublisherAdapter adapter = new SqsAnalysisJobPublisherAdapter(
                sqsClient,
                new ObjectMapper().findAndRegisterModules(),
                "http://localhost:4566/000000000000/analysis-jobs"
        );

        adapter.publish(new AnalysisJobMessage(
                1L, AnalysisInputType.RGB_SINGLE, 10L, null, RequestedModelType.RGB_ONLY, 1L, "trace", OffsetDateTime.now()
        ));

        verify(sqsClient).sendMessage(any(software.amazon.awssdk.services.sqs.model.SendMessageRequest.class));
    }

    @Test
    void publishFailsWhenQueueUrlMissing() {
        SqsAnalysisJobPublisherAdapter adapter = new SqsAnalysisJobPublisherAdapter(
                sqsClient,
                new ObjectMapper().findAndRegisterModules(),
                ""
        );

        assertThatThrownBy(() -> adapter.publish(new AnalysisJobMessage(
                1L, AnalysisInputType.RGB_SINGLE, 10L, null, RequestedModelType.RGB_ONLY, 1L, "trace", OffsetDateTime.now()
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.QUEUE_UNAVAILABLE);
    }
}
