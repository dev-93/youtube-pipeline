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

    // 1. Gemini를 통한 스타일 분석/추천 및 마케팅 문구 생성
    console.log('Gemini Marketing Agent starting...');
    
    // 레퍼런스가 있으면 분석, 없으면 AI가 추천하는 브랜딩 스타일 적용
    const hasReferences = referenceImages && referenceImages.length > 0;
    
    const marketingAgentPrompt = hasReferences 
      ? `당신은 마케팅 디자인 전문가입니다.
         1단계: 제공된 레퍼런스 이미지들의 스타일 DNA를 분석하세요.
         2단계: 제품 "${productName || 'product'}"이 이 스타일로 변신할 수 있도록 "transform into [스타일 키워드], maintaining the product shape and details exactly" 형식의 영어 프롬프트를 작성하세요.
         3단계: 이 제품과 스타일에 어울리는 매력적인 인스타그램 마케팅 문구(한국어)와 해시태그를 작성하세요.
         
         반드시 아래 JSON 형식으로만 답변하세요:
         {
           "stylePrompt": "영어 프롬프트",
           "marketingCaption": "인스타 홍보 문구",
           "hashtags": ["#태그1", "#태그2"]
         }`
      : `당신은 프리미엄 브랜드 디렉터입니다.
         1단계: 제품 사진을 보고 이 제품("${productName || 'product'}")을 가장 고가로 보이게 할 프리미엄 브랜딩 스타일(예: 럭셔리 스튜디오, 내추럴 감성, 미니멀리즘 등)을 스스로 결정하세요.
         2단계: 제품을 해당 스타일로 탈바꿈시킬 "transform into [AI 추천 스타일], maintaining the product shape and details exactly" 형식의 영어 프롬프트를 작성하세요.
         3단계: 이 제품의 가치를 높여줄 매력적인 인스타그램 마케팅 문구(한국어)와 해시태그를 작성하세요.
         
         반드시 아래 JSON 형식으로만 답변하세요:
         {
           "stylePrompt": "영어 프롬프트",
           "marketingCaption": "인스타 홍보 문구",
           "hashtags": ["#태그1", "#태그2"]
         }`;

    // 이미지 데이터를 Gemini 형식에 맞게 변환
    const imagesToAnalyze = hasReferences ? referenceImages : [productImage];
    const geminiImages = imagesToAnalyze.map((img: string) => {
      const [mimeInfo, base64Data] = img.includes(',') ? img.split(',') : ['image/jpeg', img];
      const mimeType = mimeInfo.includes(':') ? mimeInfo.split(':')[1].split(';')[0] : 'image/jpeg';
      return {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
    });

    // JSON 형식으로 결과 받기
    const agentResponse = await generateVisualContent(marketingAgentPrompt, geminiImages, true);
    const { stylePrompt, marketingCaption, hashtags } = JSON.parse(agentResponse);
    
    console.log('Gemini Agent Decision:', stylePrompt);
    console.log('Marketing Caption Generated.');

    // 2. FAL-AI 호출 (이미지 생성)
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
        num_inference_steps: 25,
        guidance_scale: 7.5,
        sync_mode: true
      })
    });
    console.log('FAL-AI response received.');

    if (!falResponse.ok) {
      const errorData = await falResponse.json();
      console.error('FAL API Error:', errorData);
      throw new Error(`FAL API 요청 실패: ${JSON.stringify(errorData)}`);
    }

    const falData = await falResponse.json();
    
    return NextResponse.json({
      success: true,
      stylePrompt,
      marketingCaption,
      hashtags,
      generatedImage: falData.images?.[0]?.url || falData.url || null
    });

  } catch (error) {
    console.error('Style Transfer Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
