# secretNewsService 참고 문서 요약

> 원본 참고 경로: `/Users/whatsupjuno/WTF/whatdid_dev_final/docs`
> 사용 원칙: 원본 문서는 수정하지 않는다. 본 문서는 secretNewsService 작업을 위해 핵심 패턴만 요약한다.

## 1. whatdid 문서에서 가져올 설계 원칙

### 1-1. 요구사항 우선
- 구현 편의보다 요구사항 명세서를 우선한다.
- 개발 전 기획 문서와 설계 문서를 먼저 확정한다.
- 문서 충돌 시 우선순위를 명시한다.

### 1-2. 상태 중심 설계
- 단순 CRUD가 아니라 상태 전이를 중심으로 업무 로직을 설계한다.
- 상태 전이표에 없는 직접 업데이트를 금지한다.
- 상태 변경 이벤트는 감사 로그로 복원 가능해야 한다.

### 1-3. 권한 분리
- 사용자 유형만으로 권한을 판단하지 않고, 리소스 소유/연결 범위를 함께 본다.
- 화면 제어는 UX 보조 수단이고, 최종 권한 검증은 서버에서 수행한다.
- 내부 사용자와 외부 사용자 인증 경로를 분리한다.

### 1-4. 스냅샷/불변본 원칙
- 외부에 공개되거나 확정된 산출물은 이후 원본 데이터 변경과 독립적으로 보존한다.
- 공개본을 실시간 조합으로만 렌더링하지 않는다.
- 확정본 생성과 현재 확정본 포인터 갱신은 단일 트랜잭션으로 처리한다.

### 1-5. 추적 가능성
- 작성, 수정, 승인, 반려, 발송, 로그인, 외부 공개, 댓글, 시스템 작업은 감사 로그를 남긴다.
- 결과값만 저장하지 않고 과정 복원이 가능해야 한다.

## 2. 구현 컨벤션 참고

### 2-1. 권장 기술 스택
- 프론트엔드: Next.js App Router + TypeScript
- 백엔드: NestJS + TypeScript + REST API
- 데이터베이스: PostgreSQL + TypeORM Repository 패턴
- 인프라: Docker / Docker Compose
- 인증: OAuth 또는 이메일 OTP + JWT 조합

### 2-2. 백엔드 계층
```text
presentation/controllers,dto,guards
  -> application/use-cases,commands,queries,ports
    -> domain/entities,policies,value-objects,enums
      -> infrastructure/repositories,orm,external adapters
```

### 2-3. 금지 규칙
- Controller에서 Repository 직접 호출 금지
- 비즈니스 규칙을 Repository에 구현 금지
- Active Record 패턴 금지
- GraphQL 사용 금지
- PUT 사용 금지. 변경은 PATCH 사용
- `any`, 빈 `catch`, 잔존 `console.log` 금지
- `synchronize: true` 금지
- 민감 정보가 포함된 `.env` 커밋 금지

## 3. secretNewsService에 적용할 해석

secretNewsService는 아직 상세 요구사항이 없으므로 아래 가정으로 1차 문서를 작성한다.

- 사용자는 뉴스를 등록/수집하고, 비공개 또는 제한 공개 상태로 관리한다.
- 뉴스 항목은 초안, 검토, 승인, 공개, 보관 상태를 가진다.
- 외부 공개 또는 배포된 뉴스는 불변 스냅샷으로 보존한다.
- 공개 전 내부 협업 댓글과 공개 후 외부 피드백은 분리한다.
- 민감/비공개 뉴스 접근은 권한, 조직, 구독/초대 범위로 제한한다.
- 모든 조회/수정/공개/배포 행위는 감사 로그 대상이다.

## 4. 미확정 사항

아래 항목은 주노 확인이 필요하다.

1. secretNewsService의 실제 목적: 내부 비밀 뉴스 큐레이션인지, 유료 뉴스레터인지, 보안 뉴스 모니터링인지 확인 필요
2. 사용자 유형: 관리자/편집자/독자/외부 기고자/고객사 중 어떤 역할이 필요한지 확인 필요
3. 수집 방식: 수동 등록, RSS/API 크롤링, AI 요약, 외부 제보 중 포함 범위 확인 필요
4. 배포 채널: 웹, 이메일, Discord, Slack, Telegram, RSS 중 포함 범위 확인 필요
5. 공개 정책: 완전 비공개, 링크 공개, 조직별 공개, 유료 구독 공개 중 선택 필요
