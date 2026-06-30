# ERD 도메인별 테이블 정리

## 1. 테이블명 표기 기준

| 구분 | 기준 | 예시 |
| --- | --- | --- |
| 논리 테이블명 | 문서와 ERD 설명에서는 대문자로 표기 | USERS, PLANTS, ZONES, INSPECTIONS |
| 물리 테이블명 | 실제 PostgreSQL DDL에서는 소문자 snake_case 사용 | users, plants, zones, inspections |
| 컬럼명 | 실제 PostgreSQL DDL 기준 소문자 snake_case 사용 | created_at, updated_at, image_pair_id |
| FK 참조 | 실제 PostgreSQL DDL 기준 소문자 snake_case 사용 | inspection_images.inspection_id → inspections.id |

본 ERD는 화면 단위가 아니라 **데이터 책임 기준**으로 도메인을 분리한다.

본 ERD는 기본적으로 **3차 정규화, 3NF**를 목표로 설계한다.

다만 OPERATION_LOGS는 운영 추적과 감사 목적의 로그 테이블이므로 정규화보다 이벤트 추적 편의성을 우선한다.

---

## 2. 정규화 기준

| 정규화 단계 | 적용 여부 | 설명 |
| --- | --- | --- |
| 1정규형, 1NF | 충족 | 하나의 컬럼에 여러 값을 저장하지 않고, 이미지·Pair·결함 후보·검토 이력을 별도 테이블로 분리한다. |
| 2정규형, 2NF | 충족 | 대부분 단일 PK id를 사용하므로 복합키 일부에만 의존하는 부분 함수 종속 문제가 거의 없다. |
| 3정규형, 3NF | 충족 | 다른 FK를 통해 알 수 있는 plant_id, zone_id, inspection_id 등의 중복 저장을 제거해 이행 함수 종속을 줄인다. |
| 예외 | OPERATION_LOGS | 로그성 테이블이므로 여러 대상을 선택적으로 참조할 수 있다. |

### 정규화 반영 내용

| 테이블 | 제거한 중복 컬럼 | 이유 |
| --- | --- | --- |
| INSPECTIONS | plant_id | zone_id → ZONES.plant_id로 발전소를 알 수 있다. |
| INSPECTION_IMAGES | plant_id, zone_id | inspection_id → INSPECTIONS.zone_id → ZONES.plant_id로 구역과 발전소를 알 수 있다. |
| IMAGE_PAIRS | plant_id, zone_id | inspection_id → INSPECTIONS.zone_id → ZONES.plant_id로 구역과 발전소를 알 수 있다. |
| ANALYSIS_JOBS | inspection_id | image_id 또는 image_pair_id를 통해 점검 회차를 알 수 있다. |
| ANALYSIS_RESULTS | inspection_id, plant_id, zone_id, equipment_id, target_type, input_type | analysis_job_id → ANALYSIS_JOBS → INSPECTION_IMAGES 또는 IMAGE_PAIRS를 통해 대상 정보를 알 수 있다. |

---

# 3. 도메인별 테이블 정리

## 3.1 USER / ACCESS DOMAIN

사용자 계정, 승인 상태, 역할, 발전소 접근 권한을 관리하는 도메인이다.

| Table | Columns | Description |
| --- | --- | --- |
| USERS | id, email, name, provider, provider_user_id, role, account_status, last_login_at, created_at, updated_at | Google OAuth 기반 사용자 계정과 승인 상태, 권한 역할을 저장한다. |
| PLANT_MEMBERS | id, plant_id, user_id, member_role, status, created_at, updated_at | 사용자와 발전소의 접근 권한 관계를 저장한다. USERS와 PLANTS의 N:M 관계를 연결한다. |

### 주요 관계

| 관계 | 설명 |
| --- | --- |
| USERS 1:N PLANTS | 사용자는 발전소를 생성할 수 있다. |
| USERS N:M PLANTS through PLANT_MEMBERS | 사용자는 여러 발전소에 접근할 수 있고, 발전소도 여러 사용자를 가질 수 있다. |
| PLANT_MEMBERS.plant_id → PLANTS.id | 발전소 접근 권한 대상 |
| PLANT_MEMBERS.user_id → USERS.id | 접근 권한을 가진 사용자 |

### 설계 메모

| 항목 | 설명 |
| --- | --- |
| USERS.role | USER / ADMIN 같은 권한 구분값을 저장한다. |
| USERS.account_status | PENDING / APPROVED / INACTIVE 같은 승인 상태를 저장한다. |
| PLANT_MEMBERS.member_role | OWNER / MANAGER / VIEWER 등 발전소 단위 역할을 저장할 수 있다. |
| PLANT_MEMBERS | 일반 사용자가 본인이 등록했거나 접근 권한이 있는 발전소만 조회하도록 하기 위한 핵심 테이블이다. |

---

## 3.2 PLANT / ZONE / EQUIPMENT DOMAIN

발전소, 구역, 하위 설비 구조를 관리하는 도메인이다.

| Table | Columns | Description |
| --- | --- | --- |
| PLANTS | id, name, location, description, status, created_by_user_id, created_at, updated_at | 발전소의 기본 정보를 저장한다. 시스템의 최상위 관리 단위이다. |
| ZONES | id, plant_id, name, location, description, status, created_by_user_id, created_at, updated_at | 발전소 하위의 구역 정보를 저장한다. 점검이 생성되는 상위 관리 단위이다. |
| EQUIPMENTS | id, zone_id, parent_equipment_id, equipment_type, name, position_code, status, created_by_user_id, created_at, updated_at | Zone 하위의 Array, Panel, Module 구조를 통합 관리한다. 자기참조로 계층 구조를 표현한다. |

### 주요 관계

| 관계 | 설명 |
| --- | --- |
| PLANTS 1:N ZONES | 하나의 발전소는 여러 구역을 가진다. |
| ZONES 1:N EQUIPMENTS | 하나의 구역은 여러 하위 설비를 가진다. |
| EQUIPMENTS 1:N EQUIPMENTS | Array → Panel → Module 구조를 parent_equipment_id로 표현한다. |

### 설계 메모

| 항목 | 설명 |
| --- | --- |
| ZONE의 역할 | ZONE은 분석 결과를 직접 가지는 대상이 아니라, INSPECTION이 생성되는 상위 관리 단위이다. |
| EQUIPMENTS 통합 관리 | Array, Panel, Module을 각각 별도 테이블로 나누지 않고 EQUIPMENTS 하나로 관리한다. |
| parent_equipment_id | 설비 계층을 표현한다. 예: Array-01 → Panel-001 → Module-001 |
| equipment_type | ARRAY / PANEL / MODULE 중 하나를 저장한다. |
| position_code | A01-P001-M001 같은 위치 식별 코드로 사용할 수 있다. |

---

## 3.3 INSPECTION / IMAGE DOMAIN

점검 회차, 업로드 이미지 메타데이터, RGB-Thermal Pair 관계를 관리하는 도메인이다.

| Table | Columns | Description |
| --- | --- | --- |
| INSPECTIONS | id, zone_id, name, captured_at, capture_method, inspector_name, memo, inspection_status, created_by_user_id, created_at, updated_at | 특정 구역에 대한 점검 회차 또는 점검 이벤트를 저장한다. 발전소 정보는 zone_id를 통해 조회한다. |
| INSPECTION_IMAGES | id, inspection_id, equipment_id, target_type, image_type, original_filename, mime_type, file_size, bucket_name, object_key, file_url, captured_at, upload_status, status, uploaded_by_user_id, created_at, updated_at | 이미지 파일 자체가 아니라 이미지 메타데이터와 객체 저장소 경로를 저장한다. 구역과 발전소 정보는 inspection_id를 통해 조회한다. |
| IMAGE_PAIRS | id, inspection_id, equipment_id, target_type, rgb_image_id, thermal_image_id, status, created_by_user_id, created_at, updated_at | 동일 점검, 동일 검사 대상의 RGB 이미지와 열화상 이미지를 연결한다. Fusion 분석 입력으로 사용된다. |

### 주요 관계

| 관계 | 설명 |
| --- | --- |
| ZONES 1:N INSPECTIONS | 하나의 구역은 여러 점검 회차를 가진다. |
| INSPECTIONS 1:N INSPECTION_IMAGES | 하나의 점검 회차에는 여러 RGB/열화상 이미지가 업로드될 수 있다. |
| EQUIPMENTS 1:N INSPECTION_IMAGES | 특정 Array, Panel, Module을 촬영한 이미지인 경우 equipment_id로 연결한다. |
| INSPECTION_IMAGES 1:0..1 IMAGE_PAIRS as rgb_image_id | 하나의 RGB 이미지는 최대 하나의 Pair에 연결된다. |
| INSPECTION_IMAGES 1:0..1 IMAGE_PAIRS as thermal_image_id | 하나의 열화상 이미지는 최대 하나의 Pair에 연결된다. |

### 상세 컬럼 설명

| Table | Column | Description |
| --- | --- | --- |
| INSPECTIONS | zone_id | MVP 기준 NOT NULL. 점검은 구역 기준으로 생성한다. 발전소 정보는 zone_id를 통해 조회한다. |
| INSPECTIONS | captured_at | 촬영 또는 점검 시점 |
| INSPECTIONS | capture_method | DRONE / MANUAL / OTHER 등 촬영 방식 |
| INSPECTIONS | inspection_status | READY / UPLOADING / ANALYZING / COMPLETED / FAILED 등 점검 상태 |
| INSPECTION_IMAGES | inspection_id | 이미지가 속한 점검 회차. 구역과 발전소는 inspection_id → INSPECTIONS → ZONES를 통해 조회한다. |
| INSPECTION_IMAGES | equipment_id | Zone 전체 이미지이면 NULL, Array/Panel/Module 이미지이면 EQUIPMENTS.id를 참조한다. |
| INSPECTION_IMAGES | target_type | ZONE / ARRAY / PANEL / MODULE |
| INSPECTION_IMAGES | image_type | RGB / THERMAL |
| INSPECTION_IMAGES | bucket_name | S3 또는 MinIO 버킷명 |
| INSPECTION_IMAGES | object_key | 객체 저장소 내부 파일 키 |
| INSPECTION_IMAGES | file_url | 파일 접근 URL 또는 Backend가 제공할 파일 경로 |
| IMAGE_PAIRS | inspection_id | Pair가 속한 점검 회차. 구역과 발전소는 inspection_id를 통해 조회한다. |
| IMAGE_PAIRS | equipment_id | Zone 전체 Pair이면 NULL, 특정 Array/Panel/Module Pair이면 EQUIPMENTS.id를 참조한다. |
| IMAGE_PAIRS | rgb_image_id | Pair로 연결된 RGB 이미지 ID |
| IMAGE_PAIRS | thermal_image_id | Pair로 연결된 열화상 이미지 ID |
| IMAGE_PAIRS | target_type | Pair가 연결되는 검사 대상 단위 |

### 설계 메모

| 항목 | 설명 |
| --- | --- |
| INSPECTIONS의 의미 | 단순 이미지 업로드 묶음이 아니라 특정 구역에 대한 점검 회차/점검 이벤트이다. |
| INSPECTION_IMAGES의 의미 | 이미지 파일 자체가 아니라 이미지 메타데이터와 객체 저장소 경로를 저장한다. |
| 실제 이미지 저장 위치 | 실제 이미지는 S3 또는 MinIO 같은 객체 저장소에 저장한다. |
| DB 저장 경로 정보 | DB에는 bucket_name, object_key, file_url, original_filename, mime_type, file_size 등을 저장한다. |
| IMAGE_PAIRS의 기준 | 동일 점검, 동일 검사 대상 단위, 동일 검사 대상 위치의 RGB/열화상 이미지를 연결한다. 동일 구역 여부는 inspection_id를 통해 확인한다. |
| equipment_id nullable | Zone 전체 촬영은 equipment_id가 없고, 특정 Array/Panel/Module 촬영일 때만 equipment_id를 가진다. |
| 정규화 기준 | INSPECTION_IMAGES와 IMAGE_PAIRS에는 plant_id, zone_id를 직접 저장하지 않는다. 구역과 발전소는 inspection_id를 통해 조회한다. |
| 정합성 검증 | Pair 생성 시 RGB 이미지와 열화상 이미지의 inspection_id, target_type, equipment_id가 일치하는지 Backend에서 검증한다. |

---

## 3.4 AI ANALYSIS / RESULT DOMAIN

AI 분석 작업, 분석 결과 요약, 개별 결함 후보, 검토 이력을 관리하는 도메인이다.

| Table | Columns | Description |
| --- | --- | --- |
| ANALYSIS_JOBS | id, image_id, image_pair_id, input_type, requested_model_type, model_type, job_status, requested_by_user_id, requested_at, started_at, completed_at, failure_code, failure_message, created_at, updated_at | AI 분석 요청과 비동기 작업 상태를 저장한다. 분석 대상은 단건 이미지 또는 RGB-Thermal Pair이다. |
| ANALYSIS_RESULTS | id, analysis_job_id, model_type, model_name, model_version, model_format, runtime, input_size, threshold, result_status, anomaly_count, max_confidence, area_ratio, severity_score, severity_level, action_candidate, priority_level, review_status, bbox_bucket_name, bbox_object_key, bbox_file_url, heatmap_bucket_name, heatmap_object_key, heatmap_file_url, mask_bucket_name, mask_object_key, mask_file_url, analyzed_at, created_at, updated_at | 분석 작업의 결과 요약, 모델 실행 정보, 조치 후보, 심각도, 우선순위를 저장한다. 대상 정보는 analysis_job_id를 통해 조회한다. |
| DETECTED_DEFECTS | id, analysis_result_id, defect_type, defect_source, confidence, area_ratio, bbox_x, bbox_y, bbox_width, bbox_height, mask_bucket_name, mask_object_key, mask_file_url, severity_score, severity_level, action_candidate, created_at, updated_at | 분석 결과 안의 개별 결함 후보 영역을 저장한다. |
| RESULT_REVIEW_HISTORIES | id, analysis_result_id, reviewer_user_id, previous_review_status, new_review_status, previous_action_candidate, new_action_candidate, memo, created_at, updated_at | 사용자가 분석 결과를 검토하거나 상태/조치 후보를 변경한 이력을 저장한다. |

### 주요 관계

| 관계 | 설명 |
| --- | --- |
| INSPECTION_IMAGES 1:N ANALYSIS_JOBS | RGB 단건 또는 열화상 단건 분석은 image_id를 대상으로 생성한다. |
| IMAGE_PAIRS 1:N ANALYSIS_JOBS | RGB-Thermal Fusion 분석은 image_pair_id를 대상으로 생성한다. |
| ANALYSIS_JOBS 1:1 ANALYSIS_RESULTS | 하나의 분석 작업은 하나의 결과 요약을 가진다. |
| ANALYSIS_RESULTS 1:N DETECTED_DEFECTS | 하나의 분석 결과에는 여러 결함 후보 영역이 포함될 수 있다. |
| ANALYSIS_RESULTS 1:N RESULT_REVIEW_HISTORIES | 하나의 분석 결과는 여러 검토 상태 변경 이력을 가질 수 있다. |

### 상세 컬럼 설명

| Table | Column | Description |
| --- | --- | --- |
| ANALYSIS_JOBS | image_id | RGB 또는 열화상 단건 분석 대상. Pair 분석인 경우 NULL이다. |
| ANALYSIS_JOBS | image_pair_id | RGB-Thermal Pair 분석 대상. 단건 분석인 경우 NULL이다. |
| ANALYSIS_JOBS | input_type | RGB_SINGLE / THERMAL_SINGLE / RGB_THERMAL_PAIR |
| ANALYSIS_JOBS | requested_model_type | 사용자가 요청한 모델 유형 또는 자동 라우팅 기준 |
| ANALYSIS_JOBS | model_type | 실제 실행된 모델 유형 |
| ANALYSIS_JOBS | job_status | QUEUED / RUNNING / SUCCEEDED / FAILED 등 분석 작업 상태 |
| ANALYSIS_RESULTS | analysis_job_id | 분석 작업과 1:1 연결된다. 점검, 구역, 발전소, 검사 대상 정보는 analysis_job_id를 통해 조회한다. |
| ANALYSIS_RESULTS | model_name, model_version, model_format, runtime | 모델 재현성과 운영 추적을 위한 실행 정보 |
| ANALYSIS_RESULTS | severity_level | LOW / MEDIUM / HIGH / CRITICAL 등 심각도 |
| ANALYSIS_RESULTS | action_candidate | CLEANING / RETAKE / FIELD_INSPECTION / REPLACEMENT_REVIEW 등 조치 후보 |
| ANALYSIS_RESULTS | bbox_bucket_name, bbox_object_key, bbox_file_url | Bounding Box 결과 이미지 경로 |
| ANALYSIS_RESULTS | heatmap_bucket_name, heatmap_object_key, heatmap_file_url | Heatmap 결과 이미지 경로 |
| ANALYSIS_RESULTS | mask_bucket_name, mask_object_key, mask_file_url | Mask 결과 이미지 경로 |
| DETECTED_DEFECTS | bbox_x, bbox_y, bbox_width, bbox_height | 결함 후보 영역의 Bounding Box 좌표 |
| DETECTED_DEFECTS | confidence | 모델이 탐지한 결함 후보의 신뢰도 |
| DETECTED_DEFECTS | defect_source | RGB / THERMAL / FUSION 중 어떤 입력에서 나온 결함인지 구분 |
| RESULT_REVIEW_HISTORIES | previous_review_status, new_review_status | 검토 상태 변경 전/후 값 |
| RESULT_REVIEW_HISTORIES | reviewer_user_id | 검토 또는 상태 변경을 수행한 사용자 |

### 설계 메모

| 항목 | 설명 |
| --- | --- |
| ANALYSIS_JOBS의 대상 | ANALYSIS_JOBS는 inspection 전체가 아니라 image_id 또는 image_pair_id를 대상으로 생성한다. |
| ANALYSIS_JOBS 정규화 | ANALYSIS_JOBS에는 inspection_id를 직접 저장하지 않는다. 점검 회차는 image_id 또는 image_pair_id를 통해 조회한다. |
| 단건 분석 | RGB 또는 열화상 이미지 1장을 image_id로 분석한다. |
| Pair 분석 | RGB-Thermal Pair를 image_pair_id로 분석한다. |
| ANALYSIS_RESULTS의 의미 | 분석 결과 전체 요약과 모델 실행 정보를 저장한다. |
| ANALYSIS_RESULTS 정규화 | ANALYSIS_RESULTS에는 inspection_id, plant_id, zone_id, equipment_id, target_type, input_type을 직접 저장하지 않는다. 대상 정보는 analysis_job_id를 통해 조회한다. |
| DETECTED_DEFECTS의 의미 | 하나의 결과 안에 존재하는 개별 이상 후보 영역을 저장한다. |
| RESULT_REVIEW_HISTORIES의 의미 | 사람이 결과를 확인하거나 조치 후보/검토 상태를 변경한 이력을 저장한다. |
| 결과 이미지 저장 | bbox, heatmap, mask 결과 이미지는 객체 저장소에 저장하고, DB에는 bucket_name, object_key, file_url 형태의 경로만 저장한다. |
| 조회 성능 대응 | 결과 목록, 대시보드, 변화 추적 조회 성능이 부족해지면 View, Materialized View, Index로 보완한다. |

---

## 3.5 OPERATION / AUDIT DOMAIN

서비스 사용 이력, 주요 운영 이벤트, 관리자 작업 추적을 관리하는 도메인이다.

| Table | Columns | Description |
| --- | --- | --- |
| OPERATION_LOGS | id, actor_user_id, event_category, event_type, target_table, target_id, plant_id, zone_id, inspection_id, image_id, image_pair_id, analysis_job_id, analysis_result_id, ip_address, user_agent, message, detail, created_at, updated_at | 로그인, 이미지 업로드, 분석 요청, 분석 실패, 결과 검토, 관리자 작업 등 주요 운영 이벤트를 기록한다. |

### 주요 관계

| 관계 | 설명 |
| --- | --- |
| OPERATION_LOGS.actor_user_id → USERS.id | 이벤트를 수행한 사용자 |
| OPERATION_LOGS.plant_id → PLANTS.id | 이벤트와 관련된 발전소 |
| OPERATION_LOGS.zone_id → ZONES.id | 이벤트와 관련된 구역 |
| OPERATION_LOGS.inspection_id → INSPECTIONS.id | 이벤트와 관련된 점검 |
| OPERATION_LOGS.image_id → INSPECTION_IMAGES.id | 이벤트와 관련된 이미지 |
| OPERATION_LOGS.image_pair_id → IMAGE_PAIRS.id | 이벤트와 관련된 Pair |
| OPERATION_LOGS.analysis_job_id → ANALYSIS_JOBS.id | 이벤트와 관련된 분석 작업 |
| OPERATION_LOGS.analysis_result_id → ANALYSIS_RESULTS.id | 이벤트와 관련된 분석 결과 |

### 설계 메모

| 항목 | 설명 |
| --- | --- |
| OPERATION_LOGS의 목적 | 서비스 주요 이벤트를 추적하고 관리자 화면에서 확인하기 위한 로그 테이블이다. |
| 기록 대상 | 로그인, 이미지 업로드, Pair 생성, 분석 요청, 분석 실패, 검토 상태 변경, 관리자 승인/비활성화 작업 등 |
| 선택적 참조 | 이벤트 종류에 따라 관련 FK만 값이 있고 나머지는 NULL일 수 있다. |
| detail | 이벤트 상세 정보는 JSON 문자열 또는 text 형태로 저장할 수 있다. |
| 정규화 예외 | OPERATION_LOGS는 감사·추적 목적의 로그 테이블이므로 여러 FK를 선택적으로 가질 수 있다. |
| SYSTEM_LOGS 제외 | 시스템 오류 상세 로그는 MVP DB 테이블로 분리하지 않고 CloudWatch Logs, Console Log 등 외부 로그 체계를 우선 활용한다. |

---

# 4. 주요 관계 요약

| 관계 | 설명 |
| --- | --- |
| USERS 1:N PLANTS | 사용자는 발전소를 생성한다. |
| USERS N:M PLANTS through PLANT_MEMBERS | 사용자는 접근 권한이 있는 발전소만 조회·관리한다. |
| PLANTS 1:N ZONES | 발전소는 여러 구역을 가진다. |
| ZONES 1:N EQUIPMENTS | 구역은 Array, Panel, Module 구조를 가진다. |
| EQUIPMENTS 1:N EQUIPMENTS | 설비는 parent_equipment_id로 자기참조 계층을 가진다. |
| ZONES 1:N INSPECTIONS | 점검은 구역 기준으로 생성된다. 발전소 정보는 ZONES를 통해 조회한다. |
| INSPECTIONS 1:N INSPECTION_IMAGES | 하나의 점검 회차에 여러 이미지가 업로드된다. |
| EQUIPMENTS 1:N INSPECTION_IMAGES | 특정 설비를 촬영한 이미지만 equipment_id를 가진다. Zone 전체 이미지는 equipment_id가 NULL이다. |
| INSPECTION_IMAGES 1:0..1 IMAGE_PAIRS as rgb_image_id | RGB 이미지는 최대 하나의 Pair에 연결된다. |
| INSPECTION_IMAGES 1:0..1 IMAGE_PAIRS as thermal_image_id | 열화상 이미지는 최대 하나의 Pair에 연결된다. |
| INSPECTION_IMAGES 1:N ANALYSIS_JOBS | RGB 또는 열화상 단건 이미지 분석 작업을 생성한다. |
| IMAGE_PAIRS 1:N ANALYSIS_JOBS | RGB-Thermal Pair 분석 작업을 생성한다. |
| ANALYSIS_JOBS 1:1 ANALYSIS_RESULTS | 분석 작업 하나는 결과 요약 하나를 가진다. 대상 정보는 ANALYSIS_JOBS의 image_id 또는 image_pair_id를 통해 조회한다. |
| ANALYSIS_RESULTS 1:N DETECTED_DEFECTS | 결과 하나는 여러 결함 후보를 가진다. |
| ANALYSIS_RESULTS 1:N RESULT_REVIEW_HISTORIES | 결과 하나는 여러 검토 이력을 가진다. |
| OPERATION_LOGS optional FK | 운영 로그는 USERS, PLANTS, ZONES, INSPECTIONS, INSPECTION_IMAGES, IMAGE_PAIRS, ANALYSIS_JOBS, ANALYSIS_RESULTS를 선택적으로 참조한다. |

---

# 5. 핵심 설계 메모

| 주제 | 설계 기준 |
| --- | --- |
| 도메인 분리 기준 | 화면 단위가 아니라 데이터 책임 기준으로 분리한다. |
| 정규화 기준 | 본 ERD는 1NF, 2NF, 3NF를 충족하는 것을 목표로 설계한다. |
| 중복 FK 제거 | INSPECTION_IMAGES, IMAGE_PAIRS, ANALYSIS_RESULTS에는 plant_id, zone_id 같은 조회용 중복 FK를 저장하지 않는다. |
| ZONE | 분석 결과를 직접 가지지 않고, INSPECTION이 생성되는 상위 관리 단위이다. |
| INSPECTIONS | 단순 이미지 묶음이 아니라 특정 구역에 대한 점검 회차/점검 이벤트이다. INSPECTIONS는 zone_id만 직접 가진다. plant_id는 ZONES를 통해 조회한다. |
| INSPECTION_IMAGES | 이미지 파일 자체가 아니라 이미지 메타데이터와 객체 저장소 경로를 저장한다. 구역과 발전소는 inspection_id를 통해 조회한다. |
| 이미지 저장 방식 | 실제 이미지는 S3 또는 MinIO에 저장하고 DB에는 bucket_name, object_key, file_url, original_filename, mime_type, file_size를 저장한다. |
| EQUIPMENTS | Array, Panel, Module을 하나의 테이블로 통합 관리하고 parent_equipment_id로 계층을 표현한다. |
| IMAGE_PAIRS | 동일 점검, 동일 대상의 RGB 이미지와 열화상 이미지를 연결한다. 동일 구역 여부는 inspection_id를 통해 확인한다. |
| ANALYSIS_JOBS | inspection 전체가 아니라 image_id 또는 image_pair_id를 대상으로 생성한다. inspection_id는 직접 저장하지 않는다. |
| ANALYSIS_RESULTS | 분석 작업의 결과 요약과 모델 실행 정보를 저장한다. 점검/구역/발전소/검사 대상 정보는 analysis_job_id를 통해 조회한다. |
| DETECTED_DEFECTS | 분석 결과 안의 개별 결함 후보 영역을 저장한다. |
| RESULT_REVIEW_HISTORIES | 사람이 분석 결과를 검토하거나 상태를 변경한 이력을 저장한다. |
| OPERATION_LOGS | 로그인, 이미지 업로드, 분석 요청, 분석 실패, 결과 검토, 관리자 작업 등 주요 운영 이벤트를 기록한다. |
| 로그 테이블 예외 | OPERATION_LOGS는 감사·추적 목적의 로그 테이블이므로 여러 FK를 선택적으로 가질 수 있다. |
| 조회 성능 보완 | 대시보드나 결과 목록 조회 성능이 부족해지면 중복 컬럼 추가보다 View, Materialized View, Index를 우선 검토한다. |

---

# 6. MVP 제외 테이블

아래 테이블은 MVP ERD에서는 제외한다. 필요 시 운영 단계 또는 고도화 단계에서 추가한다.

| 제외 테이블 | 제외 이유 |
| --- | --- |
| SYSTEM_LOGS | 시스템 오류 로그는 CloudWatch Logs, Console Log 등 외부 로그 체계로 우선 관리한다. |
| ADMIN_ACTION_LOGS | 관리자 작업은 OPERATION_LOGS의 event_category / event_type으로 통합 기록한다. |
| RESULT_VISUALIZATIONS | MVP에서는 bbox/heatmap/mask 결과 이미지 경로를 ANALYSIS_RESULTS에 직접 저장한다. |
| DASHBOARD_STATISTICS | 대시보드 통계는 초기에는 ANALYSIS_RESULTS, DETECTED_DEFECTS, INSPECTIONS를 조회·집계한다. 성능이 부족하면 View 또는 Materialized View를 검토한다. |
| MODEL_VERSION | 모델 버전 정보는 MVP에서는 ANALYSIS_RESULTS의 model_name, model_version, model_format 컬럼으로 관리한다. |
| MODEL_ARTIFACT | 모델 파일 관리는 MVP DB 테이블이 아니라 파일 저장소 또는 배포 관리 문서에서 관리한다. |
| NOTIFICATIONS | 알림 기능은 MVP 핵심 흐름에서 제외한다. |
| REPORTS | 리포트 생성 기능은 결과 조회 이후 고도화 기능으로 분리한다. |

---

# 7. 최종 ERD 구조 요약

```
USERS
→ PLANTS
→ ZONES
   ├→ EQUIPMENTS
   └→ INSPECTIONS
        └→ INSPECTION_IMAGES
             ├→ IMAGE_PAIRS
             └→ ANALYSIS_JOBS
                  └→ ANALYSIS_RESULTS
                       ├→ DETECTED_DEFECTS
                       └→ RESULT_REVIEW_HISTORIES

IMAGE_PAIRS
→ ANALYSIS_JOBS

OPERATION_LOGS
→ USERS / PLANTS / ZONES / INSPECTIONS / INSPECTION_IMAGES / IMAGE_PAIRS / ANALYSIS_JOBS / ANALYSIS_RESULTS
```