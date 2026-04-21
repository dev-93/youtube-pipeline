---
name: biz-youtube
description: AI Shorts Agent — 유튜브 쇼츠 콘텐츠 자동화 파이프라인. 트렌드 분석 → 시나리오 → Kling 프롬프트 → 마케팅.
---

# 📺 AI Shorts Agent (유튜브 쇼츠)

경로: `/` (메인 페이지)
API: `src/app/api/generate/route.ts`
프롬프트: `AGENT_PROMPTS.theme`, `.scenario`, `.kling`, `.marketing`

## 에이전트 체인
1. 트렌드 분석가 → 주간 트렌드 기반 주제 5개 추천
2. 시나리오 작가 → 4장면 시각적 스토리보드 (무대사, B급 감성)
3. Kling 프롬프트 → 영상 생성 AI용 영어 프롬프트 변환
4. 마케터 → 제목/해시태그 30개/설명글 생성

## 콘텐츠 컨셉
"왜 안돼?" — 3~7세 아이들의 호기심 + 부모 교육 효과를 결합한 B급 감성 교육 쇼츠.
캐릭터는 Ugly-cute 스타일, 무대사, 전 세계 타겟.

## 자동화
- GitHub Actions (`weekly-trends.yml`) 매주 월요일 트렌드 자동 갱신
- `scripts/update-trends.js` → `data/trends.json`

## 프롬프트 수정 시
`src/app/api/generate/route.ts`의 `AGENT_PROMPTS` 객체에서 해당 step 수정.
