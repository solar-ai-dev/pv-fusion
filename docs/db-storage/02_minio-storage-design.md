# MinIO / S3 Storage 설계

## 1. 문서 목적

본 문서는 로컬 MinIO와 운영 AWS S3를 공통 기준으로 사용하는 객체 저장소 설계를 정리한다.

주요 목적은 다음과 같다.

- 원본 이미지와 분석 결과 이미지의 저장 위치를 표준화한다.
- DB에 저장할 Storage 메타데이터 기준을 명확히 한다.
- 파일 접근 시 Backend 인증·권한 검증을 최종 기준으로 고정한다.
- 운영 S3와 로컬 MinIO를 같은 object key 규칙으로 대응시킨다.
- RGB 이미지와 열화상 이미지의 독립적인 저장 및 분석 결과 구조를 정의한다.

현재 운영 서비스에서는 RGB 이미지와 열화상 이미지를 각각 독립적인 이미지로 저장하고 분석한다.

Pair 생성·관리와 Fusion 분석은 현재 운영 Storage 계약에 포함하지 않는다.

---

## 2. 로컬 MinIO와 운영 S3의 대응 관계

| 구분 | 로컬 환경 | 운영 환경 |
| --- | --- | --- |
| 객체 저장소 | MinIO | AWS S3 |
| 접근 설정 | local profile, endpoint override | prod profile, AWS SDK 기본 endpoint |
| Bucket 이름 | 로컬 기본값 또는 환경변수 | 환경변수 |
| 인증 방식 | 로컬 Access Key / Secret Key | IAM Role 또는 기본 credential chain 우선 |
| 서비스 코드 | 동일 | 동일 |

운영과 로컬의 차이는 Storage 처리 로직이 아니라 연결 설정, endpoint, 인증 정보 관리 방식이다.

서비스 코드는 MinIO와 S3를 모두 S3 호환 객체 저장소로 취급한다.

local 환경에서는 MinIO endpoint와 path-style access 설정을 사용한다.

prod 환경에서는 별도 endpoint override를 사용하지 않고 AWS S3 기본 endpoint를 사용한다.

---

## 3. Bucket 기준

권장 Bucket 기준:

- 로컬 Bucket: `pv-insight-local`
- 운영 Bucket 이름: 환경변수로 관리

운영 Bucket 이름은 문서에 고정하지 않는다.

원칙:

- 원본 이미지와 결과 이미지는 공통 Bucket에 저장하고 prefix로 구분하는 방식을 기본으로 한다.
- 현재 코드 기준으로 원본과 결과를 위한 별도 Bucket 계약은 사용하지 않는다.
- 로컬과 운영에서 동일한 object key 구조를 사용한다.
- Bucket 이름은 코드에 하드코딩하지 않는다.
- 운영 Bucket은 Public Access를 기본적으로 허용하지 않는다.
- Bucket 생성, 암호화, Versioning, Lifecycle 정책은 클라우드 배포·운영 문서를 우선한다.

기본 구조:

```text
Bucket
├─ originals/
├─ results/
└─ temp/
```

모델 파일을 같은 S3 Bucket에 저장하는 경우에도 이미지 저장 prefix와 구분해야 한다.

예:

```text
models/
```

모델 파일 저장과 다운로드 방식의 최신 기준은 모델 Manifest 및 배포 관련 문서를 우선하며, 본 문서에서는 이미지와 분석 결과 Storage 계약을 중심으로 다룬다.

---

## 4. Object key 구조

권장 object key 예시:

```text
originals/inspections/{inspectionId}/rgb/{imageId}_{uuid}.{ext}
originals/inspections/{inspectionId}/thermal/{imageId}_{uuid}.{ext}

results/analysis-jobs/{jobId}/bbox/{resultId}_{uuid}.{ext}
results/analysis-jobs/{jobId}/heatmap/{resultId}_{uuid}.{ext}
results/analysis-jobs/{jobId}/mask/{resultId}_{uuid}.{ext}

temp/uploads/{uuid}.{ext}
temp/analysis/{jobId}/{uuid}.{ext}
```

원칙:

- 원본 이미지 object key는 Backend가 생성한다.
- 분석 결과 object key는 AI Worker 또는 결과 저장 담당 계층이 공통 규칙에 따라 생성한다.
- 사용자 입력으로 전달된 object key를 그대로 사용하지 않는다.
- 원본 파일명을 object key로 직접 사용하지 않는다.
- ID와 UUID를 함께 사용해 충돌 가능성을 줄인다.
- 확장자는 검증된 MIME type을 기준으로 결정한다.
- object key에 사용자 이메일, 사용자명, Secret과 같은 민감 정보를 포함하지 않는다.
- RGB와 열화상 이미지는 서로 다른 prefix를 사용한다.
- Pair 또는 Fusion 전용 prefix는 현재 운영 구조에 만들지 않는다.

### 4.1 원본 object key 생성 기준

원본 업로드 시점에는 다음 값이 확보되어 있어야 한다.

- `inspectionId`
- `imageId`
- `imageType`
- 검증된 파일 확장자
- 생성된 UUID

이미지 유형에 따른 prefix:

| imageType | Prefix |
| --- | --- |
| `RGB` | `originals/inspections/{inspectionId}/rgb/` |
| `THERMAL` | `originals/inspections/{inspectionId}/thermal/` |

### 4.2 결과 object key 생성 기준

분석 결과 저장 시점에는 다음 값을 사용할 수 있다.

- `jobId`
- `resultId`
- 시각화 유형
- 생성된 UUID
- 검증된 파일 확장자

시각화 유형에 따른 prefix:

| 시각화 유형 | Prefix |
| --- | --- |
| Bounding Box | `results/analysis-jobs/{jobId}/bbox/` |
| Heatmap | `results/analysis-jobs/{jobId}/heatmap/` |
| Mask | `results/analysis-jobs/{jobId}/mask/` |

[확인 필요]

결과 파일명을 `jobId`만으로 생성할지, `resultId`까지 포함할지는 실제 결과 저장 시점과 저장 방식에 맞춰 최종 확인한다.

다만 어느 방식을 사용하더라도 동일한 Job 재처리 시 결과 파일 충돌과 덮어쓰기 여부를 명확히 처리해야 한다.

---

## 5. 원본 이미지 저장 경로

원본 RGB 이미지와 열화상 이미지는 다음 경로 체계를 따른다.

```text
RGB:
originals/inspections/{inspectionId}/rgb/{imageId}_{uuid}.{ext}

THERMAL:
originals/inspections/{inspectionId}/thermal/{imageId}_{uuid}.{ext}
```

이 구조를 사용하면 다음과 같은 장점이 있다.

- 점검 기준으로 원본 이미지 파일을 묶어 관리할 수 있다.
- RGB와 열화상 이미지 prefix를 분리할 수 있다.
- 이미지 유형별 조회와 운영 점검이 쉽다.
- 동일 점검에 여러 이미지가 등록되어도 `imageId`와 UUID로 파일을 구분할 수 있다.
- DB의 `inspection_images` 메타데이터와 Storage 객체를 연결하기 쉽다.

RGB 이미지와 열화상 이미지는 같은 점검에 포함되어 있더라도 별개의 객체로 저장한다.

현재 운영 서비스에서는 두 이미지를 Pair 객체로 묶거나 Pair 전용 Storage 경로를 생성하지 않는다.

---

## 6. 분석 결과 이미지 저장 경로

분석 결과 이미지는 분석 Job 기준으로 관리한다.

권장 경로:

```text
Bounding Box:
results/analysis-jobs/{jobId}/bbox/{resultId}_{uuid}.{ext}

Heatmap:
results/analysis-jobs/{jobId}/heatmap/{resultId}_{uuid}.{ext}

Mask:
results/analysis-jobs/{jobId}/mask/{resultId}_{uuid}.{ext}
```

이 구조를 사용하면 다음과 같은 장점이 있다.

- 결과 파일을 분석 작업 단위로 묶을 수 있다.
- `analysis_results`의 시각화 메타데이터와 연결하기 쉽다.
- 동일 이미지의 재분석 결과를 서로 다른 `jobId`로 분리할 수 있다.
- RGB 분석 결과와 열화상 분석 결과를 각각 독립적인 Job으로 추적할 수 있다.

결과 생성 기준:

- Bounding Box는 모델 출력과 후처리가 지원하는 경우 저장한다.
- Heatmap은 실제 모델 출력 또는 후처리에서 생성된 경우에만 저장한다.
- Mask는 실제 Segmentation 결과가 생성된 경우에만 저장한다.
- 모든 분석에서 Bounding Box, Heatmap, Mask가 동시에 생성된다고 가정하지 않는다.
- 생성되지 않은 시각화 항목은 DB에서 `null`로 처리할 수 있다.
- 빈 이미지 파일이나 임의의 Placeholder 파일을 결과 객체로 저장하지 않는다.

현재 운영 결과는 RGB 또는 Thermal 이미지 한 건의 분석 Job에 대응한다.

Pair 또는 Fusion 결과 파일은 현재 운영 Storage 계약에 포함하지 않는다.

---

## 7. 임시 파일 경로

임시 업로드 파일 또는 분석 중간 산출물은 다음 prefix를 사용할 수 있다.

```text
temp/uploads/{uuid}.{ext}
temp/analysis/{jobId}/{uuid}.{ext}
```

주의:

- `temp/` 경로는 영구 저장이 보장되는 경로가 아니다.
- 임시 객체는 최종 저장이 완료된 뒤 제거할 수 있다.
- 분석 실패 시 남은 임시 객체를 정리할 수 있어야 한다.
- temp 객체를 사용자 결과 화면에서 직접 조회하지 않는다.
- temp object key를 최종 결과 메타데이터로 저장하지 않는다.
- 실제 보존 기간과 정리 주기는 운영 Lifecycle 정책에서 결정한다.
- 운영에서는 S3 Lifecycle Rule 적용을 검토한다.
- 로컬 MinIO에서는 별도 정리 스크립트 또는 개발 환경 초기화 절차를 사용할 수 있다.

[확인 필요]

임시 객체의 보존 기간과 정리 주기는 실제 업로드·분석 실패 패턴을 확인한 뒤 확정한다.

---

## 8. DB에 저장할 필드 기준

DB에는 파일 바이너리를 저장하지 않는다.

객체 저장소에서 파일을 찾는 데 필요한 메타데이터만 저장한다.

### 8.1 `inspection_images`

주요 Storage 메타데이터:

- `bucket_name`
- `object_key`
- `file_url`
- `original_filename`
- `mime_type`
- `file_size`

필드 기준:

| 필드 | 기준 |
| --- | --- |
| `bucket_name` | 객체가 저장된 Bucket 이름 |
| `object_key` | Bucket 내부 객체 경로 |
| `file_url` | 영구 공개 URL이 아닌 경우 `null` 허용 |
| `original_filename` | 사용자가 업로드한 원본 파일명 |
| `mime_type` | 서버가 검증한 MIME type |
| `file_size` | 업로드된 파일 크기 |

`file_url`에는 만료되는 Presigned URL을 영구 저장하지 않는다.

파일 접근 시마다 Backend가 스트림 또는 제한된 접근 URL을 생성하는 구조라면 `file_url`은 `null`로 둘 수 있다.

### 8.2 `analysis_results`

주요 시각화 메타데이터:

- `bbox_bucket_name`
- `bbox_object_key`
- `bbox_file_url`
- `heatmap_bucket_name`
- `heatmap_object_key`
- `heatmap_file_url`
- `mask_bucket_name`
- `mask_object_key`
- `mask_file_url`

시각화 결과가 생성되지 않은 경우 해당 필드는 `null`일 수 있다.

예:

- Bounding Box만 생성된 결과
- Bounding Box와 Mask가 생성된 RGB Segmentation 결과
- Bounding Box와 Heatmap이 생성된 열화상 결과
- 별도의 시각화 파일이 생성되지 않은 결과

`*_file_url`에는 만료되는 Presigned URL을 영구 저장하지 않는 것을 기본으로 한다.

### 8.3 `detected_defects`

결함 후보별 Mask가 별도 객체로 생성되는 경우 다음 필드를 사용할 수 있다.

- `mask_bucket_name`
- `mask_object_key`
- `mask_file_url`

결함 후보별 Mask를 생성하지 않는 모델에서는 해당 필드를 `null`로 유지한다.

### 8.4 저장 금지 정보

다음 정보는 DB의 파일 경로 메타데이터로 저장하지 않는다.

- S3 Access Key
- S3 Secret Key
- MinIO Access Key
- MinIO Secret Key
- AWS Session Token
- 장기 유효 Presigned URL
- 사용자 Authorization Header
- 전체 로컬 파일 시스템 경로
- 업로드 임시 디렉터리 경로

---

## 9. 파일 접근 기준

파일 접근 원칙:

- 사용자는 MinIO 또는 S3에 직접 접근하지 않는다.
- Frontend는 Backend Public API를 통해 미리보기 또는 결과 이미지를 요청한다.
- Backend는 사용자 인증과 데이터 접근 권한을 검증한다.
- Backend는 `imageId`, `resultId` 등 도메인 식별자를 기준으로 DB 메타데이터를 조회한다.
- Backend는 사용자가 임의로 전달한 Bucket 이름이나 object key를 그대로 신뢰하지 않는다.
- 권한 검증 후 Backend가 파일 스트림을 반환하거나 제한된 접근 URL을 제공한다.
- 파일 접근 정책은 Backend의 인증·권한 검증을 최종 기준으로 한다.
- AI Worker는 내부 처리 목적으로만 Storage에 접근한다.
- AI Worker의 Storage 접근 경로는 외부 사용자에게 공개하지 않는다.

### 9.1 원본 이미지 접근

원본 이미지 접근 시 Backend는 다음 항목을 확인한다.

1. 요청 사용자의 인증 상태
2. 이미지 존재 여부
3. 이미지가 연결된 점검 정보
4. 점검이 속한 구역과 발전소
5. 사용자의 해당 발전소 접근 권한
6. 이미지 활성 상태
7. Storage 객체 존재 여부

### 9.2 분석 결과 이미지 접근

분석 결과 이미지 접근 시 Backend는 다음 항목을 확인한다.

1. 요청 사용자의 인증 상태
2. 분석 결과 존재 여부
3. 분석 결과와 분석 Job의 연결
4. 분석 Job과 원본 이미지의 연결
5. 이미지가 속한 점검·구역·발전소
6. 사용자의 데이터 접근 권한
7. 요청한 시각화 유형의 실제 생성 여부
8. Storage 객체 존재 여부

### 9.3 Presigned URL 기준

Presigned URL을 사용하는 경우:

- 제한된 만료 시간을 설정한다.
- 사용자 권한 검증 후 발급한다.
- URL을 DB에 장기 저장하지 않는다.
- URL 전체를 로그에 남기지 않는다.
- Frontend가 임의의 object key로 Presigned URL을 요청할 수 없도록 한다.
- 공개 Bucket이나 영구 공개 URL 방식으로 대체하지 않는다.

직접 공개 URL을 장기적으로 노출하는 구조는 기본 설계로 사용하지 않는다.

---

## 10. 파일명 생성 기준

- 원본 파일명은 DB의 `original_filename`에만 저장한다.
- object key에는 ID와 UUID를 사용한다.
- 파일 확장자는 검증된 MIME type을 기준으로 결정한다.
- 사용자가 올린 파일명을 Storage 경로 식별자로 직접 사용하지 않는다.
- 원본 파일명의 경로 구분 문자와 특수문자를 object key에 그대로 사용하지 않는다.
- 파일명만으로 이미지 유형이나 권한을 판단하지 않는다.
- 업로드 파일의 MIME type과 실제 파일 형식을 서버에서 검증한다.
- 확장자만으로 이미지 파일 여부를 판단하지 않는다.

이 기준은 다음 문제를 줄이기 위한 것이다.

- 경로 충돌
- 동일 파일명 충돌
- 특수문자와 인코딩 문제
- 경로 조작 위험
- 사용자 정보 노출
- 잘못된 확장자 업로드
- 운영 환경별 파일 시스템 차이

---

## 11. 환경변수 이름 기준

환경변수 상세 기준은 다음 문서를 단일 최신 기준으로 사용한다.

```text
docs/17_environment-variable-secret-contract.md
```

본 문서에서는 Storage 기능과 직접 관련된 환경변수만 요약한다.

### 11.1 Backend Storage 환경변수

현재 Backend 운영 설정에서 사용하는 대표 키:

- `AWS_REGION`
- `S3_BUCKET_NAME`
- `S3_PATH_STYLE_ACCESS_ENABLED`

역할:

| 환경변수 | 역할 | local | prod |
| --- | --- | --- | --- |
| `AWS_REGION` | AWS SDK Region | 로컬 Region 값 | 운영 AWS Region |
| `S3_BUCKET_NAME` | 원본 및 결과 객체 Bucket | MinIO Bucket | AWS S3 Bucket |
| `S3_PATH_STYLE_ACCESS_ENABLED` | Path-style access 사용 여부 | 일반적으로 `true` | 일반적으로 `false` |

[확인 필요]

Backend의 local MinIO endpoint와 로컬 credential을 어떤 Property 이름으로 주입하는지는 실제 Backend 설정 파일과 `.env.example`을 기준으로 확인한다.

문서에 없는 새로운 환경변수 이름을 임의로 운영 필수값으로 추가하지 않는다.

### 11.2 AI Worker Storage 환경변수

현재 AI Worker의 canonical Storage 키:

- `AWS_REGION`
- `STORAGE_DEFAULT_BUCKET`
- `STORAGE_ENDPOINT_URL`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_REGION`
- `STORAGE_PATH_STYLE_ENABLED`

역할:

| 환경변수 | 역할 | local | prod |
| --- | --- | --- | --- |
| `AWS_REGION` | 기본 AWS Region | 로컬 Region 값 | 운영 AWS Region |
| `STORAGE_DEFAULT_BUCKET` | 기본 Storage Bucket | MinIO Bucket | AWS S3 Bucket |
| `STORAGE_ENDPOINT_URL` | S3 호환 endpoint override | MinIO endpoint | 설정하지 않음 |
| `STORAGE_ACCESS_KEY` | 로컬 Storage Access Key | local credential | 기본적으로 설정하지 않음 |
| `STORAGE_SECRET_KEY` | 로컬 Storage Secret Key | local credential | 기본적으로 설정하지 않음 |
| `STORAGE_REGION` | Storage client Region | 로컬 Region | 운영 Region |
| `STORAGE_PATH_STYLE_ENABLED` | Path-style access 여부 | 일반적으로 `true` | 일반적으로 `false` |

현재 허용 가능한 Alias:

- `S3_BUCKET_NAME`
- `STORAGE_ENDPOINT`
- `S3_ENDPOINT`

신규 설정에서는 canonical 키를 우선한다.

### 11.3 기존 MinIO 전용 키 처리

다음 이름은 과거 설계 또는 로컬 Docker Compose에서 사용되었을 수 있다.

- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_NAME`
- `MINIO_REGION`

현재 서비스 설정의 canonical 키로 확인되지 않은 경우 운영 필수 환경변수로 정의하지 않는다.

Docker Compose 내부의 MinIO 서버 초기화 변수와 애플리케이션이 사용하는 Storage client 변수는 구분한다.

예:

- MinIO 컨테이너 자체 관리자 계정 설정
- Backend Storage client 연결 설정
- AI Worker Storage client 연결 설정

이 세 종류의 값을 같은 환경변수 계약으로 혼용하지 않는다.

### 11.4 운영 Secret 기준

- 실제 Access Key와 Secret Key는 문서에 작성하지 않는다.
- `.env.example`에는 키 이름과 예시 형식만 작성한다.
- 운영 환경에서는 IAM Role 또는 기본 credential chain을 우선한다.
- 정적 AWS credential을 운영 필수값으로 요구하지 않는다.
- Kubernetes Secret 또는 AWS Secrets Manager를 사용할 수 있다.
- Secret 값을 ConfigMap에 작성하지 않는다.
- Jenkins 로그와 애플리케이션 로그에 Secret 값을 출력하지 않는다.

---

## 12. 초기화 스크립트 기준

로컬 MinIO Bucket 초기화 스크립트 위치는 다음과 같이 둘 수 있다.

```text
docker/minio/init-buckets.sh
```

초기화 스크립트 역할:

- 로컬 개발용 Bucket 존재 여부 확인
- Bucket이 없으면 생성
- 필요한 경우 로컬 전용 접근 정책 설정
- 이미 존재하는 Bucket은 중복 생성하지 않음

주의:

- 이 문서에서는 초기화 스크립트의 실제 구현을 강제하지 않는다.
- 현재 저장소에 동일 역할의 스크립트가 있다면 기존 파일을 우선한다.
- Bucket만 초기화하면 된다.
- `originals/`, `results/`, `temp/` prefix는 객체 저장 시 자동으로 생성되므로 별도 디렉터리 생성은 필수가 아니다.
- 실제 Access Key와 Secret Key를 스크립트에 하드코딩하지 않는다.
- 운영 S3 Bucket은 로컬 초기화 스크립트로 생성하지 않는다.
- 운영 S3 생성은 CloudFormation 또는 승인된 AWS 인프라 절차를 따른다.

---

## 13. 확인 기준

MinIO / S3 Storage 설계는 아래 조건을 만족해야 한다.

- 원본 RGB 이미지와 열화상 이미지를 각각 독립적인 객체로 저장한다.
- 분석 결과 이미지를 분석 Job 단위로 저장한다.
- 원본 이미지와 분석 결과 이미지는 객체 저장소에 저장한다.
- DB에는 `bucket_name`, `object_key`, `file_url` 등 경로 메타데이터만 저장한다.
- 이미지 바이너리를 PostgreSQL DB에 직접 저장하지 않는다.
- Frontend는 MinIO 또는 S3에 직접 접근하지 않는다.
- Backend가 인증·권한 검증 후 파일 접근을 중계한다.
- AI Worker는 내부 처리 목적으로만 Storage에 접근한다.
- 원본 object key는 Backend가 생성한다.
- 결과 object key는 AI Worker 또는 결과 저장 담당 계층이 공통 규칙으로 생성한다.
- 사용자가 전달한 Bucket 이름이나 object key를 그대로 신뢰하지 않는다.
- 원본 파일명을 object key로 직접 사용하지 않는다.
- ID와 UUID를 사용해 객체 경로 충돌을 방지한다.
- RGB와 열화상 이미지에 서로 다른 prefix를 사용한다.
- 현재 운영 Storage에 Pair 또는 Fusion 전용 prefix를 만들지 않는다.
- 생성되지 않은 Bounding Box, Heatmap, Mask 경로는 `null`로 처리할 수 있다.
- 만료되는 Presigned URL을 DB에 장기 저장하지 않는다.
- Presigned URL과 Storage credential을 로그에 남기지 않는다.
- local 환경은 MinIO endpoint override와 local credential을 사용한다.
- prod 환경은 AWS S3 기본 endpoint와 IAM Role 또는 기본 credential chain을 우선 사용한다.
- 환경변수 상세 기준은 `docs/17_environment-variable-secret-contract.md`를 따른다.
- 실제 Secret 값은 문서, Git, ConfigMap, Jenkins 로그에 남기지 않는다.
- temp 객체는 영구 보존 대상으로 취급하지 않으며 별도 정리 정책을 적용할 수 있어야 한다.