package com.pvfusion.service.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.analysis.AnalysisJobMessage;
import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.dto.analysis.RequestAnalysisCommand;
import com.pvfusion.application.dto.analysis.RetryAnalysisJobCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.PublishAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.SaveAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.UpdateAnalysisJobPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.imagepair.LoadImagePairPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.image.UploadStatus;
import com.pvfusion.domain.imagepair.ImagePair;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnalysisJobServiceTest {

    @Mock
    private LoadAnalysisJobPort loadAnalysisJobPort;
    @Mock
    private SaveAnalysisJobPort saveAnalysisJobPort;
    @Mock
    private UpdateAnalysisJobPort updateAnalysisJobPort;
    @Mock
    private PublishAnalysisJobPort publishAnalysisJobPort;
    @Mock
    private LoadImagePort loadImagePort;
    @Mock
    private LoadImagePairPort loadImagePairPort;
    @Mock
    private LoadInspectionPort loadInspectionPort;
    @Mock
    private AccessChecker accessChecker;
    @Mock
    private CurrentUserPort currentUserPort;

    private AnalysisJobService analysisJobService;

    @BeforeEach
    void setUp() {
        analysisJobService = new AnalysisJobService(
                loadAnalysisJobPort,
                saveAnalysisJobPort,
                updateAnalysisJobPort,
                publishAnalysisJobPort,
                loadImagePort,
                loadImagePairPort,
                loadInspectionPort,
                accessChecker,
                Optional.empty(),
                currentUserPort
        );
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
    }

    @Test
    @DisplayName("BE-UNIT-JOB-002 Thermal 단건 분석 요청은 QUEUED Job을 생성한다")
    void requestThermalSingleCreatesQueuedJob() {
        InspectionImage image = image(10L, ImageType.THERMAL, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(
                1L,
                10L,
                null,
                AnalysisInputType.THERMAL_SINGLE,
                RequestedModelType.THERMAL_ONLY,
                AnalysisModelType.THERMAL_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.THERMAL_SINGLE, RequestedModelType.THERMAL_ONLY, "trace"
        ));

        verify(publishAnalysisJobPort).publish(any());
        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.QUEUED);
        assertThat(response.imageId()).isEqualTo(10L);
        assertThat(response.imagePairId()).isNull();
    }

    @Test
    @DisplayName("BE-UNIT-JOB-003 Pair 기반 Fusion 분석 요청은 QUEUED Job을 생성한다")
    void requestPairCreatesQueuedJob() {
        ImagePair pair = imagePair(ResourceStatus.ACTIVE);
        InspectionImage rgb = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        InspectionImage thermal = image(11L, ImageType.THERMAL, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(
                3L,
                null,
                30L,
                AnalysisInputType.RGB_THERMAL_PAIR,
                RequestedModelType.EARLY_FUSION,
                AnalysisModelType.FUSION,
                AnalysisJobStatus.QUEUED,
                0,
                "pair-trace"
        );

        when(loadImagePairPort.loadImagePair(30L)).thenReturn(Optional.of(pair));
        when(accessChecker.checkImagePairAccess(1L, 30L)).thenReturn(true);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(11L)).thenReturn(Optional.of(thermal));
        when(loadAnalysisJobPort.loadAnalysisJobsByImagePairIdAndStatuses(30L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, null, 30L, AnalysisInputType.RGB_THERMAL_PAIR, RequestedModelType.EARLY_FUSION, "pair-trace"
        ));

        verify(publishAnalysisJobPort).publish(any());
        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.QUEUED);
        assertThat(response.imageId()).isNull();
        assertThat(response.imagePairId()).isEqualTo(30L);
    }

    @Test
    @DisplayName("BE-UNIT-JOB-004 RGB_SINGLE + AUTO 요청은 RGB_ONLY 모델로 라우팅된다")
    void requestRgbSingleWithAutoRoutesToRgbOnlyModel() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenAnswer(invocation -> {
            AnalysisJob job = invocation.getArgument(0);
            return new AnalysisJob(
                    11L,
                    job.getImageId(),
                    job.getImagePairId(),
                    job.getInputType(),
                    job.getRequestedModelType(),
                    job.getModelType(),
                    job.getJobStatus(),
                    job.getRequestedByUserId(),
                    job.getRequestedAt(),
                    job.getStartedAt(),
                    job.getCompletedAt(),
                    job.getRetryCount(),
                    job.getTraceId(),
                    job.getFailureCode(),
                    job.getFailureMessage(),
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );
        });

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.AUTO, "trace-rgb-auto"
        ));

        ArgumentCaptor<AnalysisJobMessage> messageCaptor = ArgumentCaptor.forClass(AnalysisJobMessage.class);
        verify(publishAnalysisJobPort).publish(messageCaptor.capture());
        assertThat(response.requestedModelType()).isEqualTo(RequestedModelType.AUTO);
        assertThat(response.modelType()).isEqualTo(AnalysisModelType.RGB_ONLY);
        assertThat(messageCaptor.getValue().requestedModelType()).isEqualTo(RequestedModelType.AUTO);
        assertThat(messageCaptor.getValue().inputType()).isEqualTo(AnalysisInputType.RGB_SINGLE);
    }

    @Test
    @DisplayName("BE-UNIT-JOB-004 THERMAL_SINGLE + AUTO 요청은 THERMAL_ONLY 모델로 라우팅된다")
    void requestThermalSingleWithAutoRoutesToThermalOnlyModel() {
        InspectionImage image = image(20L, ImageType.THERMAL, ResourceStatus.ACTIVE);
        when(loadImagePort.loadImage(20L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 20L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(20L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenAnswer(invocation -> {
            AnalysisJob job = invocation.getArgument(0);
            return new AnalysisJob(
                    21L,
                    job.getImageId(),
                    job.getImagePairId(),
                    job.getInputType(),
                    job.getRequestedModelType(),
                    job.getModelType(),
                    job.getJobStatus(),
                    job.getRequestedByUserId(),
                    job.getRequestedAt(),
                    job.getStartedAt(),
                    job.getCompletedAt(),
                    job.getRetryCount(),
                    job.getTraceId(),
                    job.getFailureCode(),
                    job.getFailureMessage(),
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );
        });

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, 20L, null, AnalysisInputType.THERMAL_SINGLE, RequestedModelType.AUTO, "trace-thermal-auto"
        ));

        ArgumentCaptor<AnalysisJobMessage> messageCaptor = ArgumentCaptor.forClass(AnalysisJobMessage.class);
        verify(publishAnalysisJobPort, times(1)).publish(messageCaptor.capture());
        assertThat(response.requestedModelType()).isEqualTo(RequestedModelType.AUTO);
        assertThat(response.modelType()).isEqualTo(AnalysisModelType.THERMAL_ONLY);
        assertThat(messageCaptor.getValue().requestedModelType()).isEqualTo(RequestedModelType.AUTO);
        assertThat(messageCaptor.getValue().inputType()).isEqualTo(AnalysisInputType.THERMAL_SINGLE);
    }

    @Test
    @DisplayName("BE-UNIT-JOB-004 RGB_THERMAL_PAIR + AUTO 요청은 FUSION 모델로 라우팅된다")
    void requestPairWithAutoRoutesToFusionModel() {
        ImagePair pair = imagePair(ResourceStatus.ACTIVE);
        InspectionImage rgb = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        InspectionImage thermal = image(11L, ImageType.THERMAL, ResourceStatus.ACTIVE);

        when(loadImagePairPort.loadImagePair(30L)).thenReturn(Optional.of(pair));
        when(accessChecker.checkImagePairAccess(1L, 30L)).thenReturn(true);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(rgb));
        when(loadImagePort.loadImage(11L)).thenReturn(Optional.of(thermal));
        when(loadAnalysisJobPort.loadAnalysisJobsByImagePairIdAndStatuses(30L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenAnswer(invocation -> {
            AnalysisJob job = invocation.getArgument(0);
            return new AnalysisJob(
                    31L,
                    job.getImageId(),
                    job.getImagePairId(),
                    job.getInputType(),
                    job.getRequestedModelType(),
                    job.getModelType(),
                    job.getJobStatus(),
                    job.getRequestedByUserId(),
                    job.getRequestedAt(),
                    job.getStartedAt(),
                    job.getCompletedAt(),
                    job.getRetryCount(),
                    job.getTraceId(),
                    job.getFailureCode(),
                    job.getFailureMessage(),
                    OffsetDateTime.now(),
                    OffsetDateTime.now()
            );
        });

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, null, 30L, AnalysisInputType.RGB_THERMAL_PAIR, RequestedModelType.AUTO, "trace-pair-auto"
        ));

        ArgumentCaptor<AnalysisJobMessage> messageCaptor = ArgumentCaptor.forClass(AnalysisJobMessage.class);
        verify(publishAnalysisJobPort, times(1)).publish(messageCaptor.capture());
        assertThat(response.requestedModelType()).isEqualTo(RequestedModelType.AUTO);
        assertThat(response.modelType()).isEqualTo(AnalysisModelType.FUSION);
        assertThat(messageCaptor.getValue().requestedModelType()).isEqualTo(RequestedModelType.AUTO);
        assertThat(messageCaptor.getValue().inputType()).isEqualTo(AnalysisInputType.RGB_THERMAL_PAIR);
        assertThat(messageCaptor.getValue().imagePairId()).isEqualTo(30L);
    }

    @Test
    void requestRgbSingleRequiresImageIdAndNullPair() {
        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(
                1L, null, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("BE-UNIT-JOB-006 권한 없는 imageId 분석 요청은 차단된다")
    void requestAnalysisFailsWhenImageAccessDenied() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void requestThermalSingleFailsWhenImageTypeIsRgb() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.THERMAL_SINGLE, RequestedModelType.THERMAL_ONLY, "trace"
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void requestPairFailsWhenPairInactive() {
        ImagePair pair = imagePair(ResourceStatus.INACTIVE);
        when(loadImagePairPort.loadImagePair(30L)).thenReturn(Optional.of(pair));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(
                1L, null, 30L, AnalysisInputType.RGB_THERMAL_PAIR, RequestedModelType.EARLY_FUSION, "trace"
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void requestAnalysisCreatesQueuedJobThenPublishes() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED, 0, "trace");

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
        ));

        InOrder inOrder = inOrder(saveAnalysisJobPort, publishAnalysisJobPort);
        inOrder.verify(saveAnalysisJobPort).saveAnalysisJob(any());
        inOrder.verify(publishAnalysisJobPort).publish(any());
        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.QUEUED);
        assertThat(response.traceId()).isEqualTo("trace");
    }

    @Test
    void requestAnalysisFailsWhenDuplicateQueuedJobExists() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob existing = analysisJob(2L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED, 0, "trace");

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);
    }

    @Test
    void requestAnalysisMarksFailedWhenPublishFails() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob queued = analysisJob(1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED, 0, "trace");
        AnalysisJob failed = analysisJob(1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.FAILED, 0, "trace");

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(queued);
        org.mockito.Mockito.doThrow(new BusinessException(ErrorCode.QUEUE_UNAVAILABLE)).when(publishAnalysisJobPort).publish(any());
        when(updateAnalysisJobPort.updateAnalysisJob(any())).thenReturn(failed);

        var response = analysisJobService.execute(new RequestAnalysisCommand(
                1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
        ));

        verify(updateAnalysisJobPort).updateAnalysisJob(any());
        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.FAILED);
    }

    @Test
    void retryFailedJobIncrementsRetryCountAndRepublishes() {
        AnalysisJob failed = analysisJob(1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.FAILED, 0, "old-trace");
        AnalysisJob retried = analysisJob(1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED, 1, "new-trace");

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(updateAnalysisJobPort.updateAnalysisJob(any())).thenReturn(retried);

        var response = analysisJobService.execute(new RetryAnalysisJobCommand(1L, 1L, "new-trace"));

        verify(publishAnalysisJobPort).publish(any());
        assertThat(response.traceId()).isEqualTo("new-trace");
    }

    @Test
    void retryQueuedJobFails() {
        AnalysisJob queued = analysisJob(1L, 10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED, 0, "trace");

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(queued));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, 1L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void queryAnalysisJobsRequiresScopedFilterForNonAdmin() {
        when(accessChecker.isAdmin(1L)).thenReturn(false);

        assertThatThrownBy(() -> analysisJobService.execute(new AnalysisJobListQuery(
                1L, null, null, null, null, null, null, 0, 20
        ))).isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    private InspectionImage image(Long imageId, ImageType imageType, ResourceStatus status) {
        return new InspectionImage(
                imageId, 20L, null, com.pvfusion.domain.common.TargetType.ZONE, imageType, "img.jpg", "image/jpeg", 10L,
                "bucket", "key", null, OffsetDateTime.now(), UploadStatus.UPLOADED, status, 1L, null, null
        );
    }

    private ImagePair imagePair(ResourceStatus status) {
        return new ImagePair(30L, 20L, null, com.pvfusion.domain.common.TargetType.ZONE, 10L, 11L, status, 1L, null, null);
    }

    private AnalysisJob analysisJob(
            Long id,
            Long imageId,
            Long imagePairId,
            AnalysisInputType inputType,
            RequestedModelType requestedModelType,
            AnalysisModelType modelType,
            AnalysisJobStatus status,
            int retryCount,
            String traceId
    ) {
        return new AnalysisJob(
                id,
                imageId,
                imagePairId,
                inputType,
                requestedModelType,
                modelType,
                status,
                1L,
                OffsetDateTime.now(),
                null,
                null,
                retryCount,
                traceId,
                null,
                null,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );
    }
}
