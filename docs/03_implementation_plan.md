# secretNewsService Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after Juno confirms the v0.1 product direction.

**Goal:** Build a secure state-based news/content operation service for restricted news collection, editing, approval, publication, distribution, and audit tracking.

**Architecture:** Use a TypeScript monorepo with Next.js web, NestJS API, PostgreSQL, and a clean layered backend architecture. NewsArticle is the central aggregate; public/externally distributed content is rendered from immutable NewsSnapshot rows.

**Tech Stack:** Next.js App Router, NestJS, PostgreSQL, TypeORM, Docker Compose, JWT auth, optional Redis/BullMQ for scheduled publication and distribution.

---

## Phase 0: Decision Gate

### Task 0.1: Confirm product meaning

**Objective:** Resolve unknowns before writing production code.

**Files:**
- Read: `docs/01_product_requirements.md`
- Read: `docs/02_system_design.md`
- Modify: `docs/01_product_requirements.md`
- Modify: `docs/02_system_design.md`

**Questions to answer:**
1. Does `secret` mean private/internal, paid/subscriber-only, security-grade, anonymous leak, or just a codename?
2. Which v0.1 channel is mandatory: web, email, Discord, Slack, Telegram?
3. Which auth is required: Google OAuth, email OTP, email/password, invitation token?
4. Is AI summarization/classification in v0.1 or deferred?
5. Are external submissions required in v0.1?

**Verification:**
- No `확인 필요` item remains for v0.1 scope-critical behavior.

---

## Phase 1: Repository Scaffold

### Task 1.1: Create monorepo package skeleton

**Objective:** Establish a deterministic project layout.

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/api/package.json`
- Create: `apps/web/package.json`
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-constants/package.json`
- Create: `.gitignore`
- Create: `.env.example`

**Steps:**
1. Add workspace definitions.
2. Add scripts: `lint`, `test`, `build`, `dev`.
3. Ensure `.env` is ignored and only `.env.example` is tracked.

**Verification:**
```bash
pnpm install
pnpm -r build
```

---

### Task 1.2: Add Docker Compose for local dependencies

**Objective:** Provide local PostgreSQL and optional Redis.

**Files:**
- Create: `docker/docker-compose.yml`

**Services:**
- `postgres` with database `secret_news`
- `redis` only if queue-based scheduling is selected

**Verification:**
```bash
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml ps
```

---

## Phase 2: Shared Domain Constants

### Task 2.1: Define article status constants

**Objective:** Centralize state values.

**Files:**
- Create: `packages/shared-constants/src/news-status.ts`
- Create: `packages/shared-constants/src/index.ts`

**Constants:**
- `DRAFT`
- `REVIEW_REQUESTED`
- `REJECTED`
- `APPROVED`
- `SCHEDULED`
- `PUBLISHED`
- `ARCHIVED`
- `WITHDRAWN`

**Verification:**
```bash
pnpm --filter @secret-news/shared-constants build
```

---

### Task 2.2: Define shared API response types

**Objective:** Keep API responses consistent.

**Files:**
- Create: `packages/shared-types/src/api.ts`
- Create: `packages/shared-types/src/news.ts`
- Create: `packages/shared-types/src/index.ts`

**Types:**
- `ApiSuccess<T>`
- `ApiError`
- `PaginatedResponse<T>`
- `NewsArticleDto`
- `NewsSnapshotDto`

**Verification:**
```bash
pnpm --filter @secret-news/shared-types build
```

---

## Phase 3: API Foundation

### Task 3.1: Bootstrap NestJS API

**Objective:** Create API app with config validation and health endpoint.

**Files:**
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.schema.ts`
- Create: `apps/api/src/presentation/controllers/health.controller.ts`

**Verification:**
```bash
pnpm --filter api test
pnpm --filter api build
```

---

### Task 3.2: Configure TypeORM without synchronize

**Objective:** Add safe DB configuration.

**Files:**
- Create: `apps/api/src/config/database.config.ts`
- Create: `apps/api/src/infrastructure/database/typeorm.module.ts`

**Rules:**
- `synchronize: false` always.
- Migrations only.
- Environment validation required before app boot.

**Verification:**
```bash
pnpm --filter api build
```

---

## Phase 4: News Domain Core

### Task 4.1: Implement NewsArticle domain entity

**Objective:** Encode allowed state transitions in domain code.

**Files:**
- Create: `apps/api/src/domain/news/news-article.entity.ts`
- Create: `apps/api/src/domain/news/news-status.enum.ts`
- Test: `apps/api/src/domain/news/news-article.entity.spec.ts`

**Test cases:**
- DRAFT can request review.
- REVIEW_REQUESTED can approve or reject.
- PUBLISHED cannot return to DRAFT.
- ARCHIVED cannot publish.

**Verification:**
```bash
pnpm --filter api test news-article.entity.spec.ts
```

---

### Task 4.2: Implement publication snapshot policy

**Objective:** Enforce immutable snapshot creation for publish.

**Files:**
- Create: `apps/api/src/domain/news/news-publication.policy.ts`
- Test: `apps/api/src/domain/news/news-publication.policy.spec.ts`

**Rules:**
- Only APPROVED or SCHEDULED article can publish.
- Publishing requires snapshot creation.
- Distribution must reference snapshot, not mutable article body.

**Verification:**
```bash
pnpm --filter api test news-publication.policy.spec.ts
```

---

## Phase 5: Persistence

### Task 5.1: Add ORM entities and migration

**Objective:** Create database schema for v0.1 core.

**Files:**
- Create: `apps/api/src/infrastructure/orm-entities/user.orm-entity.ts`
- Create: `apps/api/src/infrastructure/orm-entities/news-article.orm-entity.ts`
- Create: `apps/api/src/infrastructure/orm-entities/news-snapshot.orm-entity.ts`
- Create: `apps/api/src/infrastructure/orm-entities/audit-log.orm-entity.ts`
- Create: `apps/api/src/infrastructure/migrations/*-initial-schema.ts`

**Verification:**
```bash
pnpm --filter api migration:run
pnpm --filter api test
```

---

### Task 5.2: Implement repository ports and adapters

**Objective:** Keep application layer independent from TypeORM.

**Files:**
- Create: `apps/api/src/application/ports/news-article.repository.ts`
- Create: `apps/api/src/infrastructure/repositories/typeorm-news-article.repository.ts`

**Verification:**
```bash
pnpm --filter api test
pnpm --filter api build
```

---

## Phase 6: Use Cases and API

### Task 6.1: Create article use case

**Objective:** Allow editor/admin to create drafts.

**Files:**
- Create: `apps/api/src/application/use-cases/create-news-article.use-case.ts`
- Create: `apps/api/src/presentation/dto/create-news-article.dto.ts`
- Modify: `apps/api/src/presentation/controllers/news-articles.controller.ts`

**Verification:**
```bash
pnpm --filter api test create-news-article.use-case.spec.ts
```

---

### Task 6.2: Review transition use cases

**Objective:** Implement request-review, approve, reject with audit logging.

**Files:**
- Create: `apps/api/src/application/use-cases/request-news-review.use-case.ts`
- Create: `apps/api/src/application/use-cases/approve-news-article.use-case.ts`
- Create: `apps/api/src/application/use-cases/reject-news-article.use-case.ts`

**Verification:**
```bash
pnpm --filter api test
```

---

### Task 6.3: Publish use case with transaction

**Objective:** Publish article by creating immutable snapshot in one transaction.

**Files:**
- Create: `apps/api/src/application/use-cases/publish-news-article.use-case.ts`
- Create: `apps/api/src/application/ports/transaction-manager.ts`

**Verification:**
- Test that article status and `current_snapshot_id` update atomically.
- Test that failure rolls back snapshot and status changes.

---

## Phase 7: Web UI

### Task 7.1: Bootstrap Next.js shell

**Objective:** Provide layout, login placeholder, and protected shell.

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/(internal)/layout.tsx`
- Create: `apps/web/src/lib/api/client.ts`

**Verification:**
```bash
pnpm --filter web build
```

---

### Task 7.2: Build news article list and editor

**Objective:** Allow listing and editing draft articles.

**Files:**
- Create: `apps/web/src/app/(internal)/news/page.tsx`
- Create: `apps/web/src/app/(internal)/news/[id]/page.tsx`
- Create: `apps/web/src/components/news/NewsArticleTable.tsx`
- Create: `apps/web/src/components/news/NewsArticleEditor.tsx`

**Verification:**
```bash
pnpm --filter web test
pnpm --filter web build
```

---

## Phase 8: Gates

### Task 8.1: Add quality gates

**Objective:** Prevent unsafe changes from landing.

**Files:**
- Create: `.github/workflows/ci.yml`

**Gates:**
- install
- lint
- typecheck
- unit tests
- build

**Verification:**
```bash
pnpm lint
pnpm test
pnpm -r build
```

---

## Current Stop Point

Do not start production implementation until Juno confirms Phase 0 decisions.

Allowed before confirmation:
- document refinement
- repository scaffold
- non-domain tooling setup

Not allowed before confirmation:
- hard-coding auth method
- hard-coding distribution channel
- implementing AI/news collection assumptions as production behavior
