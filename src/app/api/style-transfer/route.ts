import { NextResponse } from 'next/server';
import { generateVisualContent } from '@/lib/gemini';

export async function POST(request: Request) {
  const FAL_KEY = process.env.FAL_KEY;
  
  if (!FAL_KEY) {
    console.error('FAL_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'FAL AI 인증 키가 설정되지 않았습니다. 배포 설정(Vercel)을 확인해주세요.' }, { status: 500 });
  }

  try {
    console.log('--- Style Transfer Started ---');
    const { referenceImages, productImage, productName } = await request.json();
    console.log(`Payload received: ${referenceImages.length} refs, 1 prod`);

    if (!referenceImages || referenceImages.length === 0) {
      return NextResponse.json({ error: '레퍼런스 이미지가 필요합니다.' }, { status: 400 });
    }

    if (!productImage) {
      return NextResponse.json({ error: '제품 이미지가 필요합니다.' }, { status: 400 });
    }

    // 1. Gemini를 통한 스타일 분석 및 프롬프트 추출
    console.log('Gemini analysis starting...');
    const styleAnalysisPrompt = `
      당신은 이미지 스타일 분석가입니다. 제공된 여러 레퍼런스 이미지들을 분석하여 공통된 시각적 스타일을 추출하세요.
      다음 요소들을 포함하여 매우 상세한 영어 프롬프트를 작성해주세요:
      - Lighting (soft, moody, dramatic, etc.)
      - Color Palette (vibrant, muted, monochromatic, etc.)
      - Composition (minimalist, overhead, cinematic, etc.)
      - Mood (premium, cozy, retro, futuristic, etc.)
      - Texture & Materials (glossy, matte, wooden, etc.)
      
      결과는 제품명 "${productName || 'product'}"이 이 스타일 내에 조화롭게 배치된 모습을 묘사하는 하나의 완성된 영어 문장이어야 합니다.
      오직 영어 프롬프트만 반환하세요.
    `;

    // 이미지 데이터를 Gemini 형식에 맞게 변환
    const geminiImages = referenceImages.map((img: string) => {
      const [mimeInfo, base64Data] = img.includes(',') ? img.split(',') : ['image/jpeg', img];
      const mimeType = mimeInfo.includes(':') ? mimeInfo.split(':')[1].split(';')[0] : 'image/jpeg';
      return {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
    });

    const stylePrompt = await generateVisualContent(styleAnalysisPrompt, geminiImages);
    console.log('Gemini analysis completed.');
    console.log('Extracted Style Prompt:', stylePrompt);

    // 2. FAL-AI Nano Banana 2 Edit 모델을 사용한 이미지 생성
    console.log('FAL-AI generation starting (sync mode)...');
    const falResponse = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_urls: [productImage],
        prompt: stylePrompt,
        num_inference_steps: 15, // 25 -> 15로 대폭 조정하여 속도 개선
        guidance_scale: 7.5,
        sync_mode: true
      })
    });
    console.log('FAL-AI raw response received.');

    if (!falResponse.ok) {
      const errorData = await falResponse.json();
      console.error('FAL API Error:', errorData);
      throw new Error(`FAL API 요청 실패: ${JSON.stringify(errorData)}`);
    }

    const falData = await falResponse.json();
    
    return NextResponse.json({
      success: true,
      stylePrompt,
      generatedImage: falData.images?.[0]?.url || falData.url || null
    });

  } catch (error) {
    console.error('Style Transfer Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
