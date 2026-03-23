import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

const AGENT_PROMPTS = {
  theme: `당신은 '트렌드 마일스톤(Trend Milestone)' 분석 전문가입니다. 
당신의 임무는 틱톡, 인스타그램 릴스, 유튜브 쇼츠의 최신 데이터 패턴을 분석하여 '지금 바로 조회수가 터질 수 있는' 주제 5가지를 생성하는 것입니다.
조건: 
1. 롱테일 키워드와 숏컬처(Short-culture)의 결합.
2. 아동 안전 지침을 철저히 준수하여 계정 폐쇄 위험 0%.
3. 호기심(Curiosity Gap)을 유발하는 강력한 헤드라인 형태.
결과는 반드시 JSON 형식으로 반환하세요.
형식: { "themes": ["주제1", "주제2", "주제3", "주제4", "주제5"] }`,

  scenario: (theme: string) => `당신은 할리우드 출신의 '시각적 스토리텔러(Visual Storyteller)'입니다. 
주제: "${theme}"를 쇼츠라는 짧은 형식 안에서 텍스트 없이오직 '행동'과 '영상미'로만 전달하세요.
작업 지침:
1. '후크(Hook)' - 시작 3초 안에 시선을 끌어야 함.
2. '긴장(Tension)' - 중간 단계에서 리듬감 있는 전개.
3. '반전/결말(Payoff)' - 끝까지 보게 만드는 보상.
결과는 반드시 JSON 형식으로 반환하세요.
형식: { "scenes": [ { "sceneNumber": 1, "description": "디테일한 시각적 묘사" }, ... ] }`,

  kling: (scenes: any[]) => `당신은 Kling AI 및 Stable Video Diffusion 전문 '프롬프트 인지 엔지니어(Prompt Cognitive Engineer)'입니다.
다음 시나리오의 각 장면을 Kling AI가 가장 선호하는 '영어' 기술적 프롬프트로 변환하세요.
프롬프트 필수 요소:
- Cinematic lighting (e.g., volumetric fog, golden hour, neon glow)
- Camera dynamics (e.g., slow dolly zoom, low angle, handheld drift)
- Texture & Detail (e.g., 8k, photorealistic, intricate textures, masterpiece)
- Motion description (e.g., subtle movements, expressive facial expressions)
스토리보드: ${JSON.stringify(scenes)}
결과는 반드시 JSON 형식으로 반환하세요.
형식: { "prompts": [ { "sceneNumber": 1, "englishPrompt": "Professional English prompt here" }, ... ] }`,

  marketing: (theme: string) => `당신은 유튜브 쇼츠 알고리즘을 해킹하는 '그로스 아키텍트(Growth Architect)'입니다.
주제: "${theme}"의 CTR(클릭률)과 시청 지속 시간을 극대화하기 위한 마케팅 에셋을 구성하세요.
작업 내용:
1. 100만 조회수급 제목: 한글과 이모지를 적절히 섞어 뇌를 자극하는 제목.
2. 하이퍼 타겟팅 해시태그: 30개의 관련성 높은 해시태그를 정교하게 선별.
3. 전환형 설명: 시청자 참여(좋아요, 구독)를 유도하는 구조화된 설명글.
결과는 반드시 JSON 형식으로 반환하세요.
형식: { "title": "제목", "hashtags": "해시태그1 #해시태그2 ...", "description": "구조화된 설명" }`
};

export const POST = async (request: Request) => {
  try {
    const { step, theme, scenes } = await request.json();

    let prompt = '';
    switch (step) {
      case 'theme':
        prompt = AGENT_PROMPTS.theme;
        break;
      case 'scenario':
        prompt = AGENT_PROMPTS.scenario(theme);
        break;
      case 'kling':
        prompt = AGENT_PROMPTS.kling(scenes);
        break;
      case 'marketing':
        prompt = AGENT_PROMPTS.marketing(theme);
        break;
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    const text = await generateContent(prompt + "\nJSON 코드만 출력하고 다른 설명은 하지 마세요.");
    // Remove JSON markdown code blocks if necessary
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
