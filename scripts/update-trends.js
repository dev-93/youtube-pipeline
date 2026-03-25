const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment from .env.local during local run
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * 트렌드 데이터를 Gemini AI를 통해 생성하고 trends.json에 저장합니다.
 */
const updateTrends = async () => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    아이들을 위한 3-7세용 및 부모용 유튜브 쇼츠 트렌드 주제를 12~15개 정도 한국어로 생성해줘.
    "왜 안돼?"(Why Not?) 컨셉으로 아이들의 호기심을 자극하거나 부모님에게 유용한 정보여야 해.
    
    주요 주제:
    1. 아이들을 위한 안전 경고 (사탕처럼 보이지만 위험한 물질 등)
    2. 부모님과 아이들이 함께 놀랄만한 신기한 생물학/과학 사실
    3. 자연 및 동물에 대한 흥미로운 지식
    
    각 주제별로 다음 데이터를 포함해줘:
    - keyword: 짧은 키워드 (예: "식초와 베이킹소다", "복어")
    - theme: 유튜브 쇼츠 제목 스타일의 문구 (이모지 포함)
    - description: 왜 놀라운지, 왜 중요한지 짧은 설명
    - target: ["3-7세용", "부모용", "전체공통"] 중 하나 선택
    
    반드시 순수 JSON 배열 형식으로만 답변해줘. 다른 텍스트는 포함하지 마.
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // JSON 추출 및 정리
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const trends = JSON.parse(jsonStr);

    const dataPath = path.join(__dirname, '../data/trends.json');
    fs.writeFileSync(dataPath, JSON.stringify(trends, null, 2), 'utf8');
    
    console.log('✅ trends.json 업데이트 성공!');
    console.table(trends);
  } catch (error) {
    console.error('❌ 트렌드 업데이트 중 오류 발생:', error);
    process.exit(1);
  }
};

updateTrends();
