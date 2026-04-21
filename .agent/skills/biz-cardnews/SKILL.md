---
name: biz-cardnews
description: Card News Agent — 인스타그램 카드뉴스 5장 자동 생성. 트렌드 → 텍스트 → 디자인 토큰 → 마케팅.
---

# 📱 Card News Agent (인스타 카드뉴스)

경로: `/card-news`
API: `src/app/api/generate/route.ts`
프롬프트: `AGENT_PROMPTS.card_trends`, `.card_writer`, `.card_image`, `.card_marketer`
컴포넌트: `src/app/card-news/components/CardPreview.tsx`

## 에이전트 체인
1. 트렌드 수집가 → AI/테크/이슈 기반 주제 3개 추천
2. 카드 작가 → 5장 카드 텍스트 (표지/정보/인사이트/솔루션/엔딩)
3. 디자인 디렉터 → CSS 디자인 토큰 (그라데이션, 글로우, 액센트)
4. 마케터 → 인스타 캡션 + 해시태그

## 디자인 원칙
- CardPreview 컴포넌트로 실시간 렌더링 (이미지 생성 AI 아님, CSS 기반)
- 다크 배경 필수 (텍스트가 흰색 고정)
- html-to-image로 JPG 다운로드
- 카드 텍스트 인라인 편집 가능

## 향후 디자인 방향 (mobileeditingclub 스타일)
- 초대형 세리프/산세리프 혼합 타이포그래피 (화면 40~60% 차지)
- 텍스트가 이미지 위에 직접 오버레이 (별도 박스 없이)
- 과감한 여백, 미니멀 레이아웃
- 제품/모델 중심 구도 + 좌하단 큰 텍스트
- 브랜드 로고 좌상단 작게
- 하단 CTA 바

## 프롬프트 수정 시
`src/app/api/generate/route.ts`의 `AGENT_PROMPTS` 객체에서 `card_*` step 수정.
`card_writer`는 Gemini Google Search Grounding 활성화됨 (최신 정보 반영).
