package com.pvfusion.service.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.dto.analysis.AnalysisJobMessage;
import com.pvfusion.application.dto.analysis.RequestAnalysisCommand;
import com.pvfusion.application.dto.analysis.RetryAnalysisJobCommand;
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

        when(loadAnalysisJobPort.loadAnalysisJob(1L)).thenReturn(Optional.of(failed));
        when(accessChecker.checkImageAccess(1L, 10L)).thenReturn(true);
        when(updateAnalysisJobPort.updateAnalysisJob(any())).thenReturn(retried);

        var response = analysisJobService.execute(new RetryAnalysisJobCommand(1L, 1L, "new-trace"));

        verify(publishAnalysisJobPort).publish(any());
        assertThat(response.traceId()).isEqualTo("new-trace");
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
