# Creator Studio — AI 에이전트 가이드

이 문서는 AI 에이전트(Gemini, Kiro 등)가 이 프로젝트에서 코드를 작성할 때 반드시 따라야 하는 규칙입니다.

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.x |
| 언어 | TypeScript (strict mode) | 5.x |
| 런타임 | React | 19.x |
| 스타일링 | Tailwind CSS 4 + CSS 변수 (globals.css) | 4.x |
| AI | Google Gemini API (@google/generative-ai) | 0.24.x |
| 이미지 생성 | FAL AI (nano-banana-2/edit) | REST API |
| 데이터 | Notion API (@notionhq/client) | 2.x |
| 애니메이션 | Framer Motion | 12.x |
| 아이콘 | Lucide React | 0.577.x |
| 이미지 내보내기 | html-to-image | 1.x |
| 테스트 | Vitest + fast-check (PBT) | 4.x |
| 배포 | Vercel | - |

## 폴더 구조

```
src/
├── app/
│   ├── page.tsx                    # AI Shorts Agent (메인, /)
│   ├── branding/page.tsx           # AI Product Branding (/branding)
│   ├── card-news/
│   │   ├── page.tsx                # Card News Agent (/card-news)
│   │   └── components/CardPreview.tsx
│   ├── api/
│   │   ├── generate/route.ts       # Shorts + Card News 공용 API
│   │   ├── branding/route.ts       # 브랜딩 전용 API
│   │   ├── notion/route.ts         # Notion CRUD
│   │   └── trends/route.ts         # 트렌드 데이터 조회
│   ├── globals.css                 # 전역 CSS 변수 + 컴포넌트 스타일
│   └── layout.tsx                  # 루트 레이아웃
├── lib/
│   └── gemini.ts                   # Gemini 클라이언트 (키 로테이션)
data/
└── trends.json                     # 주간 트렌드 (GitHub Actions 자동 갱신)
scripts/
└── update-trends.js                # 트렌드 갱신 스크립트
.gemini/skills/                     # AI 에이전트 skill 가이드
.kiro/steering/                     # Kiro 전용 steering 가이드
```

## 코딩 컨벤션

### TypeScript
- strict mode 필수 (`tsconfig.json`에 설정됨)
- `any` 사용 최소화. 불가피한 경우 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 주석 추가
- 경로 alias: `@/*` → `./src/*`
- 인터페이스는 파일 상단에 정의

### React / Next.js
- App Router 사용 (Pages Router 아님)
- 클라이언트 컴포넌트: 파일 최상단에 `'use client'` 선언
- API Route: `src/app/api/[name]/route.ts` 형식
- 서버 컴포넌트가 기본, 클라이언트 필요할 때만 `'use client'`

### 스타일링
- globals.css에 CSS 변수 정의 (`--accent-color`, `--panel-bg` 등)
- 컴포넌트 스타일은 인라인 `style={{}}` 사용 (현재 패턴)
- Tailwind는 globals.css에서 유틸리티로 사용
- 다크 테마 고정 (배경: `#0d0f14`, 텍스트: `#f8fafc`)
- 폰트: Inter + Noto Sans KR (Google Fonts CDN)

### 네이밍
- 페이지 폴더: kebab-case (`card-news`, `branding`)
- 컴포넌트: PascalCase (`CardPreview.tsx`)
- API 라우트: kebab-case (`/api/branding`)
- 변수/함수: camelCase
- 상수: UPPER_SNAKE_CASE (`STYLE_PRESETS`, `AGENT_PROMPTS`)

### 커밋
- 한국어 커밋 메시지
- 커밋/푸시는 사용자가 요청할 때만 수행

## 절대 하면 안 되는 것

### Gemini API
- `gemini-2.0-flash` 모델 사용 금지 — `gemini-2.5-flash`만 사용
- Gemini Vision (이미지 분석) 사용 금지 — 429/차단 이슈로 텍스트 전용만 사용
- API 키를 클라이언트 코드에 노출 금지 — 서버 사이드(API Route)에서만 사용
- `generateVisualContent` 함수는 레거시 — 새 기능에서 사용하지 말 것

### Notion API
- base64 이미지 데이터를 노션에 직접 전송 금지 — 413 PayloadTooLarge 발생
- System Data 블록이 50KB 초과하면 생략
- 노션 DB 속성 변경 시 `channel` select 옵션과 `상태` status 옵션이 코드와 일치하는지 반드시 확인

### 프론트엔드
- localStorage에 이미지 데이터(base64/긴 URL) 저장 금지 — QuotaExceededError 발생
- `window.location.href` 대신 Next.js `Link` 컴포넌트 사용 권장
- 마크다운 볼드체(`**`)를 Gemini 프롬프트 응답에 포함시키지 말 것 — UI 렌더링 방해

### 환경 변수
- `.env.local`은 git에 올리지 않음 (`.gitignore`에 `.env*` 설정됨)
- 새 환경 변수 추가 시 README.md에 문서화

### 일반
- `node_modules/`, `.next/` 폴더 내 파일 수정 금지
- 사용자 요청 없이 커밋/푸시 금지
- Pages Router 문법 사용 금지 (App Router만)
- `next/font` 대신 Google Fonts CDN 사용 중 — 변경하지 말 것

## 환경 변수

```env
GEMINI_API_KEY=           # Gemini API 키 (필수)
GEMINI_API_KEY_2=         # Gemini API 키 2 (429 대응, 다른 키여야 함)
GEMINI_API_KEY_3=         # Gemini API 키 3 (선택)
NOTION_API_KEY=           # Notion Integration 토큰
NOTION_DATABASE_ID=       # Notion DB ID
FAL_KEY=                  # FAL AI 인증 키
```

## 개발 서버

```bash
npm run dev    # http://localhost:4500
npm run build  # 프로덕션 빌드
npm run lint   # ESLint 실행
```

## 에이전트별 상세 가이드
- `.gemini/skills/biz-youtube/SKILL.md` — AI Shorts
- `.gemini/skills/biz-cardnews/SKILL.md` — Card News
- `.gemini/skills/biz-branding/SKILL.md` — Product Branding
- `.gemini/skills/ops-review/SKILL.md` — 코드 리뷰
- `.gemini/skills/ops-qa/SKILL.md` — QA 테스트
- `.gemini/skills/ops-plan/SKILL.md` — 기획 리뷰
