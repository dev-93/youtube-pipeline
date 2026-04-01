import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "";
if (!apiKey) console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
const genAI = new GoogleGenerativeAI(apiKey);

// 기본 모델 (검색 미사용)
export const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * 콘텐츠 생성 함수
 * @param prompt 프롬프트 텍스트
 * @param isJson JSON 응답 모드 여부
 * @param useSearch 실시간 구글 검색(Grounding) 사용 여부
 */
export const generateContent = async (prompt: string, isJson: boolean = false, useSearch: boolean = false) => {
  // 검색이 필요한 경우 도구가 포함된 모델 인스턴스를 동적으로 생성
  const currentModel = useSearch 
    ? genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        tools: [{ googleSearchRetrieval: {} }] 
      })
    : model;

  const generationConfig = isJson ? { responseMimeType: "application/json" } : {};
  
  const result = await currentModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig
  });
  
  const response = await result.response;
  return response.text();
};

