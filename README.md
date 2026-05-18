# secretNewsService

비공개/제한 공개 뉴스 콘텐츠를 수집, 작성, 검토, 승인, 웹 공개, 이메일 배포, 보관하는 상태 기반 콘텐츠 운영 서비스.

## v0.1 defaults

- `secret` means private/restricted news.
- Distribution channels: web + email.
- Internal operators: Google OAuth.
- Readers: email OTP.
- AI summarization/classification/tagging: deferred.
- External submissions/contributors: deferred.

## Workspace

```text
apps/api                  NestJS API
apps/web                  Next.js web
packages/shared-types     Shared TypeScript types
packages/shared-constants Shared enums/constants
docs                      Planning and design documents
docker                    Local development dependencies
```

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Local dependencies

```bash
docker compose -f docker/docker-compose.yml up -d
```
