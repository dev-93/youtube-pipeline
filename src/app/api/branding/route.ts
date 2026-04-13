import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini';

export async function POST(request: Request) {
  const FAL_KEY = process.env.FAL_KEY;

  if (!FAL_KEY) {
    return NextResponse.json({ error: 'FAL AI 인증 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    console.log('--- AI Product Branding Started ---');
    const { productImage, productName, brandStyle } = await request.json();

    if (!productImage) {
      return NextResponse.json({ error: '제품 이미지가 필요합니다.' }, { status: 400 });
    }

    // 1. 광고 전문가 에이전트 (Ad Creative Director)
    console.log('Ad Creative Director Agent starting...');

    const adDirectorPrompt = `당신은 프리미엄 브랜드 광고 크리에이티브 디렉터입니다.
제품명: "${productName || '제품'}"
${brandStyle ? `클라이언트 요청 스타일: "${brandStyle}"` : ''}

[참고 스타일 - mobileeditingclub 인스타그램]
- 모델이 제품을 자연스럽게 들고 있는 라이프스타일 샷
- 소프트 내추럴 라이팅, 약간 따뜻한 톤 (warm beige, soft cream)
- 미니멀하고 깔끔한 배경 (단색 또는 실내 인테리어)
- 제품이 화면의 주인공이 되는 클로즈업~미디엄샷
- 고급스럽지만 자연스러운 에디토리얼 무드
- 실제 촬영처럼 보이는 리얼리스틱 퀄리티

[작업 지시]
1단계: 이 제품의 카테고리, 타겟 고객, 브랜드 포지셔닝을 분석하세요.
2단계: 위 스타일 가이드를 참고하여 FAL AI 이미지 생성용 상세 영어 프롬프트를 작성하세요.
   - 반드시 포함: 배경 설정, 조명, 색감, 카메라 앵글, 모델 포즈(있다면), 제품 배치
   - "professional product photography" 스타일 키워드 포함
   - 제품 형태와 디테일을 정확히 유지하라는 지시 포함
3단계: 이 브랜딩 이미지를 인스타그램에 올릴 때의 마케팅 가이드를 작성하세요.
   - 추천 게시물 타입 (피드/릴스/캐러셀/스토리 중 제품에 가장 적합한 것과 이유)
   - 최적 업로드 시간대 (화~목 오후가 최고 성과, 제품 타겟에 맞게 구체적으로)
   - 캡션 작성 가이드:
     * 첫 줄: 강렬한 후킹 문장 예시 3개
     * 본문: 키워드 SEO 중심 (해시태그 아닌 검색 키워드를 캡션에 자연스럽게 포함)
     * CTA: 저장/공유/DM 유도 문구
   - 해시태그: 3~5개 니치 해시태그만 (2026년 인스타는 해시태그 5개 제한, 키워드 캡션이 30% 더 효과적)
   - DM 공유 유도 전략: "이 콘텐츠를 친구에게 보내고 싶게 만드는" 요소 제안
   - 타겟 오디언스 설정 팁

반드시 아래 JSON 형식으로만 답변하세요:
{
  "stylePrompt": "상세한 영어 이미지 생성 프롬프트",
  "concept": "브랜딩 컨셉 한줄 요약 (한국어)",
  "marketingGuide": "인스타 업로드 가이드 (한국어, 줄바꿈 포함)"
}`;

    const agentResponse = await generateContent(adDirectorPrompt, true);
    const { stylePrompt, concept, marketingGuide } = JSON.parse(agentResponse);

    console.log('Ad Director Concept:', concept);
    console.log('Style Prompt:', stylePrompt);

    // 2. FAL-AI 이미지 생성
    console.log('FAL-AI generation starting...');
    const falResponse = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_urls: [productImage],
        prompt: stylePrompt,
        aspect_ratio: "4:5",
        resolution: "1K",
        num_inference_steps: 28,
        guidance_scale: 7.5,
        sync_mode: true
      })
    });

    if (!falResponse.ok) {
      const errorData = await falResponse.json();
      console.error('FAL API Error:', errorData);
      throw new Error(`FAL API 요청 실패: ${JSON.stringify(errorData)}`);
    }

    const falData = await falResponse.json();

    return NextResponse.json({
      success: true,
      stylePrompt,
      concept,
      marketingGuide,
      generatedImage: falData.images?.[0]?.url || falData.url || null
    });

  } catch (error) {
    console.error('Style Transfer Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
