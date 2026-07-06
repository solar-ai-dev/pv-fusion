package com.pvfusion.service.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.dto.analysis.AnalysisJobMessage;
import com.pvfusion.application.dto.analysis.RequestAnalysisCommand;
import com.pvfusion.application.dto.analysis.RetryAnalysisJobCommand;
import org.springframework.dao.DataIntegrityViolationException;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.PublishAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.SaveAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.UpdateAnalysisJobPort;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
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
                loadInspectionPort,
                accessChecker,
                Optional.empty(),
                currentUserPort
        );
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
    }

    @Test
    @DisplayName("RGB 이미지 요청은 RGB_SINGLE / RGB_ONLY 단건 Job을 생성한다")
    void requestRgbSingleCreatesQueuedJob() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "rgb-trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(10L, "rgb-trace"));

        ArgumentCaptor<AnalysisJobMessage> messageCaptor = ArgumentCaptor.forClass(AnalysisJobMessage.class);
        verify(publishAnalysisJobPort).publish(messageCaptor.capture());

        assertThat(response.imageId()).isEqualTo(10L);
        assertThat(response.imagePairId()).isNull();
        assertThat(response.inputType()).isEqualTo(AnalysisInputType.RGB_SINGLE);
        assertThat(response.requestedModelType()).isEqualTo(RequestedModelType.RGB_ONLY);
        assertThat(response.modelType()).isEqualTo(AnalysisModelType.RGB_ONLY);
        assertThat(messageCaptor.getValue().imageId()).isEqualTo(10L);
        assertThat(messageCaptor.getValue().inputType()).isEqualTo(AnalysisInputType.RGB_SINGLE);
        assertThat(messageCaptor.getValue().requestedModelType()).isEqualTo(RequestedModelType.RGB_ONLY);
    }

    @Test
    @DisplayName("THERMAL 이미지 요청은 THERMAL_SINGLE / THERMAL_ONLY 단건 Job을 생성한다")
    void requestThermalSingleCreatesQueuedJob() {
        InspectionImage image = image(20L, ImageType.THERMAL, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(
                2L,
                20L,
                AnalysisInputType.THERMAL_SINGLE,
                RequestedModelType.THERMAL_ONLY,
                AnalysisModelType.THERMAL_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "thermal-trace"
        );

        when(loadImagePort.loadImage(20L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 20L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(20L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(20L, "thermal-trace"));

        ArgumentCaptor<AnalysisJobMessage> messageCaptor = ArgumentCaptor.forClass(AnalysisJobMessage.class);
        verify(publishAnalysisJobPort).publish(messageCaptor.capture());

        assertThat(response.imageId()).isEqualTo(20L);
        assertThat(response.imagePairId()).isNull();
        assertThat(response.inputType()).isEqualTo(AnalysisInputType.THERMAL_SINGLE);
        assertThat(response.requestedModelType()).isEqualTo(RequestedModelType.THERMAL_ONLY);
        assertThat(response.modelType()).isEqualTo(AnalysisModelType.THERMAL_ONLY);
        assertThat(messageCaptor.getValue().requestedModelType()).isEqualTo(RequestedModelType.THERMAL_ONLY);
    }

    @Test
    void requestAnalysisRequiresImageId() {
        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(null, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void requestAnalysisFailsWhenImageAccessDenied() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void requestAnalysisFailsWhenImageTypeIsNull() {
        InspectionImage image = image(10L, null, ResourceStatus.ACTIVE);
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void requestAnalysisFailsWhenDuplicateQueuedJobExists() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob existing = analysisJob(
                2L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);
    }

    @Test
    void requestAnalysisCreatesQueuedJobThenPublishes() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(10L, "trace"));

        InOrder order = inOrder(saveAnalysisJobPort, publishAnalysisJobPort);
        order.verify(saveAnalysisJobPort).saveAnalysisJob(any());
        order.verify(publishAnalysisJobPort).publish(any());
        assertThat(response.traceId()).isEqualTo("trace");
    }

    @Test
    void requestAnalysisFallsBackWhenCreatedAtIsNullInQueueMessage() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob saved = new AnalysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                1L,
                OffsetDateTime.now(),
                null,
                null,
                0,
                "trace",
                null,
                null,
                null,
                OffsetDateTime.now()
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        analysisJobService.execute(new RequestAnalysisCommand(10L, "trace"));

        ArgumentCaptor<AnalysisJobMessage> messageCaptor = ArgumentCaptor.forClass(AnalysisJobMessage.class);
        verify(publishAnalysisJobPort).publish(messageCaptor.capture());
        assertThat(messageCaptor.getValue().createdAt()).isNotNull();
    }

    @Test
    void requestAnalysisMarksFailedWhenPublishFails() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob queued = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "trace"
        );
        AnalysisJob failed = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED,
                0,
                "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(queued);
        doThrow(new BusinessException(ErrorCode.QUEUE_UNAVAILABLE)).when(publishAnalysisJobPort).publish(any());
        when(updateAnalysisJobPort.updateAnalysisJob(any())).thenReturn(failed);

        var response = analysisJobService.execute(new RequestAnalysisCommand(10L, "trace"));

        verify(updateAnalysisJobPort).updateAnalysisJob(any());
        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.FAILED);
    }

    @Test
    void retryFailedJobIncrementsRetryCountAndRepublishes() {
        AnalysisJob failed = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED,
                0,
                "old-trace"
        );
        AnalysisJob retried = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                1,
                "new-trace"
        );

        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(retried);

        var response = analysisJobService.execute(new RetryAnalysisJobCommand(1L, 1L, "new-trace"));

        verify(publishAnalysisJobPort).publish(any());
        assertThat(response.traceId()).isEqualTo("new-trace");
        assertThat(response.jobId()).isEqualTo(1L);
    }

    @Test
    void retryFailedJobCreatesNewQueuedJob() {
        AnalysisJob failed = analysisJob(
                8L,
                10L,
                AnalysisInputType.THERMAL_SINGLE,
                RequestedModelType.THERMAL_ONLY,
                AnalysisModelType.THERMAL_ONLY,
                AnalysisJobStatus.FAILED,
                1,
                "old-trace"
        );
        InspectionImage image = image(10L, ImageType.THERMAL, ResourceStatus.ACTIVE);
        AnalysisJob retried = analysisJob(
                9L,
                10L,
                AnalysisInputType.THERMAL_SINGLE,
                RequestedModelType.THERMAL_ONLY,
                AnalysisModelType.THERMAL_ONLY,
                AnalysisJobStatus.QUEUED,
                2,
                "new-trace"
        );

        when(loadAnalysisJobPort.loadAnalysisJob(8L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(retried);

        var response = analysisJobService.execute(new RetryAnalysisJobCommand(8L, "new-trace"));

        verify(saveAnalysisJobPort).saveAnalysisJob(any());
        verify(publishAnalysisJobPort).publish(any());
        assertThat(response.jobId()).isEqualTo(9L);
        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.QUEUED);
    }

    @Test
    void retryFailsWithConflictWhenJobStatusIsNotFailed() {
        AnalysisJob queued = analysisJob(
                1L,
                10L,
                AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY,
                AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED,
                0,
                "trace"
        );

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(queued));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_RETRY_NOT_ALLOWED);
    }

    @Test
    void retryReturnsResponseEvenWhenContextResolutionFails() {
        AnalysisJob failed = analysisJob(
                8L,
                10L,
                AnalysisInputType.THERMAL_SINGLE,
                RequestedModelType.THERMAL_ONLY,
                AnalysisModelType.THERMAL_ONLY,
                AnalysisJobStatus.FAILED,
                1,
                "old-trace"
        );
        InspectionImage image = image(10L, ImageType.THERMAL, ResourceStatus.ACTIVE);
        AnalysisJob retried = analysisJob(
                9L,
                10L,
                AnalysisInputType.THERMAL_SINGLE,
                RequestedModelType.THERMAL_ONLY,
                AnalysisModelType.THERMAL_ONLY,
                AnalysisJobStatus.QUEUED,
                2,
                "new-trace"
        );

        when(loadAnalysisJobPort.loadAnalysisJob(8L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(retried);
        when(loadInspectionPort.loadInspection(20L)).thenThrow(new IllegalStateException("context failed"));

        var response = analysisJobService.execute(new RetryAnalysisJobCommand(8L, "new-trace"));

        assertThat(response.jobId()).isEqualTo(9L);
        assertThat(response.inspectionId()).isNull();
        assertThat(response.zoneId()).isNull();
        assertThat(response.plantId()).isNull();
    }

    @Test
    void requestAnalysisFailsWhenDuplicateRunningJobExists() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob running = analysisJob(
                3L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.RUNNING, 0, "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(running));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);
    }

    @Test
    void requestAnalysisDuplicateBlockedDoesNotSaveOrPublish() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob queued = analysisJob(
                2L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED, 0, "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(queued));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class);

        org.mockito.Mockito.verifyNoInteractions(saveAnalysisJobPort);
        org.mockito.Mockito.verifyNoInteractions(publishAnalysisJobPort);
    }

    @Test
    void requestAnalysisSucceedsWhenOnlyFailedJobExists() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);
        AnalysisJob saved = analysisJob(
                5L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED, 0, "trace"
        );

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any())).thenReturn(saved);

        var response = analysisJobService.execute(new RequestAnalysisCommand(10L, "trace"));

        assertThat(response.jobStatus()).isEqualTo(AnalysisJobStatus.QUEUED);
        org.mockito.Mockito.verify(publishAnalysisJobPort).publish(any());
    }

    @Test
    void retryFailsWhenActiveQueuedJobExistsForSameImage() {
        AnalysisJob failed = analysisJob(
                1L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED, 0, "old-trace"
        );
        AnalysisJob activeQueued = analysisJob(
                7L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED, 1, "other-trace"
        );
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(activeQueued));

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, "new-trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);
    }

    @Test
    void retryFailsWhenActiveRunningJobExistsForSameImage() {
        AnalysisJob failed = analysisJob(
                1L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED, 0, "old-trace"
        );
        AnalysisJob activeRunning = analysisJob(
                8L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.RUNNING, 1, "other-trace"
        );
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(activeRunning));

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, "new-trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);
    }

    @Test
    void retryDuplicateBlockedDoesNotSaveOrPublish() {
        AnalysisJob failed = analysisJob(
                1L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED, 0, "old-trace"
        );
        AnalysisJob activeQueued = analysisJob(
                7L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.QUEUED, 1, "other-trace"
        );
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of(activeQueued));

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, "new-trace")))
                .isInstanceOf(BusinessException.class);

        org.mockito.Mockito.verifyNoInteractions(saveAnalysisJobPort);
        org.mockito.Mockito.verifyNoInteractions(publishAnalysisJobPort);
    }

    @Test
    void requestAnalysisMapsActiveJobUniqueViolationTo409() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any()))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; SQL [n/a]; constraint [ux_analysis_jobs_one_active_per_image]"));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);

        verifyNoInteractions(publishAnalysisJobPort);
    }

    @Test
    void requestAnalysisRethrowsUnrelatedDataIntegrityViolation() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any()))
                .thenThrow(new DataIntegrityViolationException("foreign key constraint violation"));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(DataIntegrityViolationException.class);

        verifyNoInteractions(publishAnalysisJobPort);
    }

    @Test
    void requestAnalysisMapsActiveJobUniqueViolationInCauseTo409() {
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        RuntimeException rootCause = new RuntimeException(
                "ERROR: duplicate key value violates unique constraint \"ux_analysis_jobs_one_active_per_image\"");
        when(saveAnalysisJobPort.saveAnalysisJob(any()))
                .thenThrow(new DataIntegrityViolationException("DB error", rootCause));

        assertThatThrownBy(() -> analysisJobService.execute(new RequestAnalysisCommand(10L, "trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);

        verifyNoInteractions(publishAnalysisJobPort);
    }

    @Test
    void retryMapsActiveJobUniqueViolationTo409() {
        AnalysisJob failed = analysisJob(
                1L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED, 0, "old-trace"
        );
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any()))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; constraint [ux_analysis_jobs_one_active_per_image]"));

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, "new-trace")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);

        verifyNoInteractions(publishAnalysisJobPort);
    }

    @Test
    void retryRethrowsUnrelatedDataIntegrityViolation() {
        AnalysisJob failed = analysisJob(
                1L, 10L,
                AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY,
                AnalysisJobStatus.FAILED, 0, "old-trace"
        );
        InspectionImage image = image(10L, ImageType.RGB, ResourceStatus.ACTIVE);

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(loadImagePort.loadImage(10L)).thenReturn(Optional.of(image));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(10L, List.of(AnalysisJobStatus.QUEUED, AnalysisJobStatus.RUNNING)))
                .thenReturn(List.of());
        when(saveAnalysisJobPort.saveAnalysisJob(any()))
                .thenThrow(new DataIntegrityViolationException("unrelated fk constraint violation"));

        assertThatThrownBy(() -> analysisJobService.execute(new RetryAnalysisJobCommand(1L, "new-trace")))
                .isInstanceOf(DataIntegrityViolationException.class);

        verifyNoInteractions(publishAnalysisJobPort);
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
                imageId,
                20L,
                null,
                com.pvfusion.domain.common.TargetType.ZONE,
                imageType,
                "img.jpg",
                "image/jpeg",
                10L,
                "bucket",
                "key",
                null,
                OffsetDateTime.now(),
                UploadStatus.UPLOADED,
                status,
                1L,
                null,
                null
        );
    }

    private AnalysisJob analysisJob(
            Long id,
            Long imageId,
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
