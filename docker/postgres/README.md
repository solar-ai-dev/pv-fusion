# docker/postgres

이 디렉터리는 로컬 PostgreSQL 실행 보조 파일 전용이다.

- 운영/로컬 스키마 변경 기준: `backend/src/main/resources/db/migration/**`
- 로컬 Docker 검증/점검 스크립트: `docker/postgres/**`

주의:

- Flyway migration 원본을 이 디렉터리로 이동하지 않는다.
- 운영 스키마 기준은 항상 Backend resources 아래의 Flyway migration을 우선한다.
- 이 디렉터리의 스크립트는 로컬 초기화/검증 보조 용도다.
