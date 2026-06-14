package com.pvfusion.adapter.out.queue;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.analysis.AnalysisJobMessage;
import com.pvfusion.application.port.out.analysis.PublishAnalysisJobPort;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;

import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Component
public class SqsAnalysisJobPublisherAdapter implements PublishAnalysisJobPort {

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;
    private final String queueUrl;

    @Autowired
    public SqsAnalysisJobPublisherAdapter(
            ObjectMapper objectMapper,
            SqsClient sqsClient,
            @Qualifier("analysisJobQueueUrl") String queueUrl
    ) {
        this.objectMapper = objectMapper;
        this.sqsClient = sqsClient;
        this.queueUrl = queueUrl;
    }

    SqsAnalysisJobPublisherAdapter(SqsClient sqsClient, ObjectMapper objectMapper, String queueUrl) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
        this.queueUrl = queueUrl;
    }

    @Override
    public void publish(AnalysisJobMessage message) {
        if (queueUrl == null || queueUrl.isBlank()) {
            throw new BusinessException(ErrorCode.QUEUE_UNAVAILABLE, "Queue URL is not configured.");
        }
        try {
            String body = objectMapper.writeValueAsString(message);
            sqsClient.sendMessage(SendMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .messageBody(body)
                    .build());
        } catch (JsonProcessingException exception) {
            throw new BusinessException(ErrorCode.QUEUE_UNAVAILABLE, "Failed to serialize analysis job message.");
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.QUEUE_UNAVAILABLE, "Failed to publish analysis job message.");
        }
    }
}
