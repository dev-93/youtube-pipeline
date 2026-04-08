import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// API 키 로테이션: 여러 키를 등록하면 429 시 다음 키로 전환
const apiKeys = [
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "",
  process.env.GEMINI_API_KEY_2 || "",
  process.env.GEMINI_API_KEY_3 || "",
].filter(k => k.length > 0);

if (apiKeys.length === 0) console.warn("WARNING: GEMINI_API_KEY is not defined.");
console.log(`Gemini API keys loaded: ${apiKeys.length}개`);

let currentKeyIndex = 0;
const getGenAI = () => new GoogleGenerativeAI(apiKeys[currentKeyIndex]);
const rotateKey = () => {
  if (apiKeys.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`API 키 로테이션 → key #${currentKeyIndex + 1}`);
  return true;
};

const MODEL_PRIMARY = "gemini-2.5-flash";
const MODEL_FALLBACK = "gemini-2.0-flash";

// 기본 모델 (외부 참조용)
export const model = getGenAI().getGenerativeModel({ model: MODEL_PRIMARY });

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

const isRetryable = (msg: string) =>
  msg.includes('429') || msg.includes('503') || msg.includes('Too Many Requests')
  || msg.includes('Service Unavailable') || msg.includes('overloaded') || msg.includes('quota');

const parseRetryDelay = (msg: string): number => {
  const match = msg.match(/retry.*?(\d+)s/i);
  return match ? Math.min(parseInt(match[1], 10), 60) : 0;
};

/**
 * 콘텐츠 생성 함수 (텍스트 전용)
 */
export const generateContent = async (prompt: string, isJson: boolean = false, useSearch: boolean = false) => {
  const models = [MODEL_PRIMARY, MODEL_FALLBACK];
  const generationConfig = isJson ? { responseMimeType: "application/json" } : {};
  const triedKeys = new Set<number>();

  for (const modelName of models) {
    triedKeys.clear();
    while (triedKeys.size < apiKeys.length) {
      triedKeys.add(currentKeyIndex);
      const genAI = getGenAI();
      const currentModel = useSearch
        ? genAI.getGenerativeModel({ model: modelName, tools: [{ googleSearchRetrieval: {} }] })
        : genAI.getGenerativeModel({ model: modelName });

      try {
        const result = await currentModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig
        });
        return result.response.text();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (isRetryable(message)) {
          // 429면 키 로테이션 시도
          if (message.includes('429') && rotateKey()) {
            console.warn(`${modelName} 429 → 키 로테이션 후 재시도`);
            continue;
          }
          // 503이면 다음 모델로
          if (modelName === MODEL_PRIMARY) {
            console.warn(`${modelName} 사용 불가, ${MODEL_FALLBACK}로 전환`);
            break;
          }
          // fallback 모델도 실패 시 대기 후 재시도
          const delay = parseRetryDelay(message) || 5;
          console.warn(`${modelName} 재시도 대기 ${delay}초...`);
          await new Promise(r => setTimeout(r, delay * 1000));
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error('API 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.');
};

/**
 * 이미지 분석을 포함한 콘텐츠 생성 함수 (Vision)
 */
export const generateVisualContent = async (
  prompt: string,
  images: { inlineData: { data: string, mimeType: string } }[],
  isJson: boolean = false
) => {
  const models = [MODEL_PRIMARY, MODEL_FALLBACK];
  const generationConfig = isJson ? { responseMimeType: "application/json" } : {};
  const triedKeys = new Set<number>();

  for (const modelName of models) {
    triedKeys.clear();
    while (triedKeys.size < apiKeys.length) {
      triedKeys.add(currentKeyIndex);
      const genAI = getGenAI();
      const currentModel = genAI.getGenerativeModel({ model: modelName });

      try {
        const result = await currentModel.generateContent({
          contents: [{
            role: "user",
            parts: [{ text: prompt }, ...images]
          }],
          generationConfig,
          safetySettings
        });

        const response = result.response;
        if (response.promptFeedback?.blockReason) {
          throw new Error(`Gemini 응답이 차단되었습니다 (사유: ${response.promptFeedback.blockReason}). 다른 이미지로 시도해주세요.`);
        }

        const text = response.text();
        if (!text) {
          throw new Error('Gemini가 빈 응답을 반환했습니다. 다른 이미지로 시도해주세요.');
        }
        return text;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        if (isRetryable(message)) {
          if (message.includes('429') && rotateKey()) {
            console.warn(`${modelName} Vision 429 → 키 로테이션 후 재시도`);
            continue;
          }
          if (modelName === MODEL_PRIMARY) {
            console.warn(`${modelName} 사용 불가, ${MODEL_FALLBACK}로 전환`);
            break;
          }
          const delay = parseRetryDelay(message) || 5;
          console.warn(`${modelName} Vision 재시도 대기 ${delay}초...`);
          await new Promise(r => setTimeout(r, delay * 1000));
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error('API 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.');
};
