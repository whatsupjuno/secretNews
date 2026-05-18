# secretNewsService 설계 문서 v0.1

## 1. 문서 목적

본 문서는 secretNewsService의 초기 시스템 아키텍처, 데이터 모델, API 경계, 상태 전이, 보안 원칙을 정의한다.

본 문서는 `docs/01_product_requirements.md`의 1차 기획 가정안을 기준으로 작성한다.

---

## 2. 기술 스택

| 영역 | 기술 | 비고 |
|---|---|---|
| 프론트엔드 | Next.js App Router + TypeScript | 내부/독자 화면 통합 가능 |
| 백엔드 | NestJS + TypeScript | REST API |
| 데이터베이스 | PostgreSQL | TypeORM Repository 패턴 |
| 작업 큐 | BullMQ 또는 Nest Schedule | 수집/예약공개/배포 작업 |
| 캐시 | Redis | 큐 사용 시 필수 |
| 인증 | Google OAuth 또는 이메일 OTP + JWT | 최종 방식 확인 필요 |
| 인프라 | Docker / Docker Compose | 로컬 개발 기준 |

---

## 3. 모노레포 구조 초안

```text
secretNews/
├── docs/
│   ├── 00_reference_summary.md
│   ├── 01_product_requirements.md
│   ├── 02_system_design.md
│   └── 03_implementation_plan.md
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── types/
│   └── api/
│       └── src/
│           ├── presentation/
│           ├── application/
│           ├── domain/
│           ├── infrastructure/
│           └── config/
├── packages/
│   ├── shared-types/
│   └── shared-constants/
├── docker/
│   └── docker-compose.yml
├── scripts/
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. 백엔드 계층 구조

```text
presentation
  controllers: HTTP 요청/응답
  dto: 입력 검증
  guards: 인증/권한
  interceptors: traceId, 로깅

application
  use-cases: 업무 시나리오
  commands: 상태 변경 입력 모델
  queries: 조회 입력 모델
  ports: 외부 의존성 인터페이스

domain
  entities: NewsArticle, NewsSnapshot, NewsSource
  policies: 권한, 공개 가능 여부, 상태 전이
  value-objects: PublishScope, SensitivityLevel
  enums: 상태값

infrastructure
  repositories: TypeORM Repository 래퍼
  orm-entities: DB 매핑
  collectors: RSS/API 수집 어댑터
  mail: 이메일 발송 어댑터
  messaging: Discord/Slack 배포 어댑터
  scheduler: 예약 공개/수집 작업
```

### 계층 금지 규칙
- Controller에서 Repository 직접 호출 금지
- Repository에 비즈니스 규칙 구현 금지
- Domain Entity에서 외부 API 호출 금지
- 상태값 직접 UPDATE 금지. 상태 전이 UseCase를 통과해야 한다.

---

## 5. 핵심 도메인

### 5-1. User
- 내부 운영자, 편집자, 리뷰어, 독자를 표현한다.
- 인증 방식과 권한 역할을 분리한다.

### 5-2. Organization
- 독자 또는 고객이 소속된 조직이다.
- 뉴스 공개 범위의 기준이 될 수 있다.

### 5-3. NewsSource
- RSS/API/수동 제보 같은 뉴스 원천이다.
- 활성/비활성, 실패 횟수, 마지막 수집 시각을 가진다.

### 5-4. NewsCandidate
- 외부 소스에서 수집된 원시 후보 뉴스다.
- 중복 판정 후 초안으로 전환될 수 있다.

### 5-5. NewsArticle
- 편집/검토/승인 대상인 운영 데이터다.
- 공개 전까지 수정 가능하다.
- 상태 전이의 중심 Aggregate다.

### 5-6. NewsSnapshot
- 공개 시점의 불변 공개본이다.
- 공개/배포된 상세 화면은 Snapshot 기준으로 렌더링한다.

### 5-7. DistributionJob / DistributionRecipient
- 배포 작업과 수신자/채널별 결과를 저장한다.

### 5-8. AuditLog
- 시스템 주요 행위를 추적한다.

---

## 6. 데이터 모델 초안

### 6-1. users
- `id`
- `email`
- `name`
- `role`: `SUPER_ADMIN | ADMIN | EDITOR | REVIEWER | READER`
- `auth_provider`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`
- `deleted_at`

### 6-2. organizations
- `id`
- `name`
- `status`: `ACTIVE | INACTIVE`
- `created_at`
- `updated_at`

### 6-3. user_organizations
- `id`
- `user_id`
- `organization_id`
- `membership_role`
- `created_at`

### 6-4. news_sources
- `id`
- `name`
- `source_type`: `RSS | API | MANUAL | SUBMISSION`
- `url`
- `status`: `ACTIVE | INACTIVE | BLOCKED`
- `last_fetched_at`
- `failure_count`
- `created_at`
- `updated_at`

### 6-5. news_candidates
- `id`
- `source_id`
- `external_id`
- `title`
- `source_url`
- `raw_content`
- `collected_at`
- `status`: `CANDIDATE | IMPORTED | DUPLICATE | IGNORED | FETCH_FAILED`
- `duplicate_of_candidate_id`
- `created_at`

### 6-6. news_articles
- `id`
- `candidate_id`
- `title`
- `summary`
- `body`
- `source_url`
- `category_id`
- `sensitivity_level`: `NORMAL | CONFIDENTIAL | SECRET`
- `publish_scope`: `PRIVATE | ORGANIZATION | INVITE_ONLY | PUBLIC_LINK`
- `status`: `DRAFT | REVIEW_REQUESTED | REJECTED | APPROVED | SCHEDULED | PUBLISHED | ARCHIVED | WITHDRAWN`
- `author_id`
- `reviewer_id`
- `scheduled_publish_at`
- `published_at`
- `current_snapshot_id`
- `created_at`
- `updated_at`
- `deleted_at`

### 6-7. news_snapshots
- `id`
- `article_id`
- `revision_no`
- `title`
- `summary`
- `body`
- `source_url`
- `category_name`
- `tags_json`
- `sensitivity_level`
- `publish_scope`
- `created_by`
- `created_at`

### 6-8. distribution_jobs
- `id`
- `snapshot_id`
- `channel`: `WEB | EMAIL | DISCORD | SLACK | TELEGRAM`
- `status`: `NOT_SENT | SENDING | SENT | PARTIAL_FAILED | FAILED`
- `started_at`
- `finished_at`
- `created_by`
- `created_at`

### 6-9. distribution_recipients
- `id`
- `job_id`
- `recipient_type`: `USER | ORGANIZATION | CHANNEL`
- `recipient_ref`
- `status`: `PENDING | SENT | FAILED`
- `error_message`
- `sent_at`

### 6-10. audit_logs
- `id`
- `actor_id`
- `actor_type`
- `action`
- `resource_type`
- `resource_id`
- `before_json`
- `after_json`
- `ip_address`
- `user_agent`
- `trace_id`
- `created_at`

---

## 7. 상태 전이 초안

### 7-1. NewsArticle 상태 전이

| 현재 상태 | 이벤트 | 다음 상태 | 수행 가능 역할 |
|---|---|---|---|
| DRAFT | 검토 요청 | REVIEW_REQUESTED | EDITOR, ADMIN |
| REVIEW_REQUESTED | 반려 | REJECTED | REVIEWER, ADMIN |
| REVIEW_REQUESTED | 승인 | APPROVED | REVIEWER, ADMIN |
| REJECTED | 수정 후 재요청 | REVIEW_REQUESTED | EDITOR, ADMIN |
| APPROVED | 예약 공개 설정 | SCHEDULED | REVIEWER, ADMIN |
| APPROVED | 즉시 공개 | PUBLISHED | REVIEWER, ADMIN |
| SCHEDULED | 예약 시각 도달 | PUBLISHED | SYSTEM |
| PUBLISHED | 공개 중단 | WITHDRAWN | ADMIN |
| PUBLISHED | 보관 | ARCHIVED | ADMIN |
| WITHDRAWN | 보관 | ARCHIVED | ADMIN |

### 7-2. 전이 금지
- `PUBLISHED -> DRAFT` 금지
- `PUBLISHED -> REVIEW_REQUESTED` 금지
- `ARCHIVED -> PUBLISHED` 금지
- 배포 시작 후 본문 직접 수정 금지

### 7-3. 공개 시 트랜잭션
공개 처리는 단일 트랜잭션에서 수행한다.

1. `news_snapshots` INSERT
2. `news_articles.current_snapshot_id` 갱신
3. `news_articles.status = PUBLISHED` 갱신
4. 감사 로그 기록
5. 배포 작업 생성

---

## 8. API 경계 초안

### 8-1. Auth
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

### 8-2. News Sources
- `GET /news-sources`
- `POST /news-sources`
- `PATCH /news-sources/:id`
- `POST /news-sources/:id/fetch`

### 8-3. Candidates
- `GET /news-candidates`
- `POST /news-candidates/:id/import`
- `POST /news-candidates/:id/ignore`

### 8-4. Articles
- `GET /news-articles`
- `POST /news-articles`
- `GET /news-articles/:id`
- `PATCH /news-articles/:id`
- `POST /news-articles/:id/request-review`
- `POST /news-articles/:id/approve`
- `POST /news-articles/:id/reject`
- `POST /news-articles/:id/publish`
- `POST /news-articles/:id/schedule`
- `POST /news-articles/:id/withdraw`
- `POST /news-articles/:id/archive`

### 8-5. Public/Reader View
- `GET /reader/news`
- `GET /reader/news/:snapshotId`

### 8-6. Distribution
- `GET /distribution-jobs`
- `POST /news-snapshots/:id/distribute`
- `POST /distribution-jobs/:id/retry-failed`

### 8-7. Audit
- `GET /audit-logs`

---

## 9. 보안 원칙

1. JWT에는 최소 식별자만 넣고 최종 권한은 DB 기준으로 판단한다.
2. 독자 조회 API는 항상 공개 범위 필터를 서버에서 강제한다.
3. 민감도 `SECRET` 뉴스 조회는 감사 로그를 남긴다.
4. 외부 배포 링크는 만료 시간과 scope를 가진 토큰을 사용한다.
5. `.env.example`에는 키 이름만 남기고 실제 값은 넣지 않는다.
6. API 에러 응답에는 스택 트레이스를 노출하지 않는다.
7. 입력 본문 렌더링 시 XSS 방지를 위해 sanitize 정책을 명시한다.

---

## 10. 미확정 설계 결정

| 항목 | 후보 | 현재 상태 |
|---|---|---|
| 인증 방식 | Google OAuth / 이메일 OTP / 이메일+비밀번호 | 확인 필요 |
| 배포 채널 | 웹 / 이메일 / Discord / Slack / Telegram | 확인 필요 |
| 뉴스 수집 | RSS / API / 수동 / 제보 | 확인 필요 |
| 유료 구독 | 포함 / 제외 | v0.1 제외 가정 |
| AI 요약 | 포함 / 제외 | v0.1 제외 가정 |
| 공개 범위 | 조직별 / 초대링크 / 공개링크 | 확인 필요 |
