package com.pvfusion.adapter.out.persistence.operation;

import com.pvfusion.adapter.out.persistence.user.UserJpaEntity;
import com.pvfusion.adapter.out.persistence.user.UserJpaRepository;
import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.application.port.out.operation.LoadOperationLogPort;
import com.pvfusion.application.port.out.operation.OperationLogRepositoryPort;
import com.pvfusion.application.port.out.operation.SaveOperationLogPort;
import com.pvfusion.domain.operation.OperationLog;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperationLogPersistenceAdapter
        implements OperationLogRepositoryPort, LoadOperationLogPort, SaveOperationLogPort {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final OffsetDateTime DEFAULT_FROM = OffsetDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    private static final OffsetDateTime DEFAULT_TO = OffsetDateTime.of(9999, 12, 31, 23, 59, 59, 0, ZoneOffset.UTC);

    private final OperationLogJpaRepository operationLogJpaRepository;
    private final OperationLogPersistenceMapper operationLogPersistenceMapper;
    private final UserJpaRepository userJpaRepository;

    @Override
    public PageResponse<OperationLogSummaryResponse> findAll(OperationLogQuery query) {
        Page<OperationLogJpaEntity> entityPage = operationLogJpaRepository.search(
                        query.actorUserId(),
                        query.eventCategory(),
                        query.eventType(),
                        query.plantId(),
                        query.zoneId(),
                        query.inspectionId(),
                        query.imageId(),
                        query.analysisJobId(),
                        query.analysisResultId(),
                        hasFrom(query.from()),
                        normalizeFrom(query.from()),
                        hasTo(query.to()),
                        normalizeTo(query.to()),
                        hasKeyword(query.keyword()),
                        normalizeKeyword(query.keyword()),
                        PageRequest.of(
                                Math.max(query.page(), 0),
                                query.size() > 0 ? query.size() : DEFAULT_PAGE_SIZE,
                                resolveSort(query.sort())
                        )
                );

        Map<Long, UserJpaEntity> actorUsers = loadActorUsers(entityPage.getContent());
        Page<OperationLogSummaryResponse> page = entityPage.map(
                entity -> operationLogPersistenceMapper.toSummaryResponse(entity, actorUsers)
        );

        return PageResponse.from(page);
    }

    @Override
    public List<OperationLogSummaryResponse> loadOperationLogs(OperationLogQuery query) {
        return findAll(query).content();
    }

    @Override
    public long countOperationLogs(OperationLogQuery query) {
        return findAll(query).totalElements();
    }

    @Override
    @Transactional
    public OperationLog save(OperationLog operationLog) {
        OperationLogJpaEntity entity = operationLog.getId() == null
                ? operationLogPersistenceMapper.toEntity(operationLog)
                : operationLogJpaRepository.findById(operationLog.getId())
                        .map(existing -> operationLogPersistenceMapper.updateEntity(operationLog, existing))
                        .orElseGet(() -> operationLogPersistenceMapper.toEntity(operationLog));

        return operationLogPersistenceMapper.toDomain(operationLogJpaRepository.save(entity));
    }

    @Override
    @Transactional
    public OperationLog saveOperationLog(OperationLog operationLog) {
        return save(operationLog);
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "%";
        }
        return "%" + keyword.trim().toLowerCase() + "%";
    }

    private boolean hasKeyword(String keyword) {
        return keyword != null && !keyword.isBlank();
    }

    private boolean hasFrom(OffsetDateTime from) {
        return from != null;
    }

    private OffsetDateTime normalizeFrom(OffsetDateTime from) {
        return from != null ? from : DEFAULT_FROM;
    }

    private boolean hasTo(OffsetDateTime to) {
        return to != null;
    }

    private OffsetDateTime normalizeTo(OffsetDateTime to) {
        return to != null ? to : DEFAULT_TO;
    }

    private Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }

        String[] tokens = sort.split(",", 2);
        String property = normalizeSortProperty(tokens[0]);
        Sort.Direction direction = tokens.length > 1 && "asc".equalsIgnoreCase(tokens[1].trim())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        return Sort.by(direction, property);
    }

    private String normalizeSortProperty(String rawProperty) {
        if (rawProperty == null) {
            return "createdAt";
        }

        String property = rawProperty.trim();
        if ("createdAt".equals(property) || "eventType".equals(property) || "targetTable".equals(property)) {
            return property;
        }
        return "createdAt";
    }

    private Map<Long, UserJpaEntity> loadActorUsers(List<OperationLogJpaEntity> entities) {
        List<Long> actorUserIds = entities.stream()
                .map(OperationLogJpaEntity::getActorUserId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (actorUserIds.isEmpty()) {
            return Collections.emptyMap();
        }

        return userJpaRepository.findAllById(actorUserIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, Function.identity()));
    }
}
