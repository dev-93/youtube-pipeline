---
inclusion: always
---

# AI Shorts Agent Suite — 프로젝트 가이드

## 프로젝트 구조
3개 독립 에이전트 기반 콘텐츠 자동화 플랫폼.

| 에이전트 | 경로 | API | 역할 |
|----------|------|-----|------|
| AI Shorts | `/` | `/api/generate` | 유튜브 쇼츠 파이프라인 |
| Card News | `/card-news` | `/api/generate` | 인스타 카드뉴스 생성 |
| Product Branding | `/style-transfer` | `/api/style-transfer` | 제품 브랜딩 이미지 생성 |

## 기술 규칙
- Gemini 모델: `gemini-2.5-flash`만 사용 (2.0-flash 사용 금지)
- API 키 로테이션: `GEMINI_API_KEY`, `GEMINI_API_KEY_2` (429 시 자동 전환)
- Gemini Vision 사용하지 않음 (차단 이슈)
- 이미지 생성: FAL AI nano-banana-2
- 노션 저장 시 base64 이미지 전송 금지 (413 방지)
- 노션 System Data 블록 50KB 초과 시 생략

## 에이전트별 상세 가이드 (원본: .gemini/skills/)
아래 파일들을 반드시 참조하여 각 에이전트의 역할, 프롬프트 설계, 마케팅 전략을 이해할 것.

- #[[file:.gemini/skills/biz-youtube/SKILL.md]] — AI Shorts 에이전트
- #[[file:.gemini/skills/biz-cardnews/SKILL.md]] — Card News 에이전트
- #[[file:.gemini/skills/biz-branding/SKILL.md]] — Product Branding + 인스타 마케팅 전략
