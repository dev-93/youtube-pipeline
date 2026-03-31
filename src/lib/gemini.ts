import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "";
if (!apiKey) console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const generateContent = async (prompt: string, isJson: boolean = false) => {
  const generationConfig = isJson ? { responseMimeType: "application/json" } : {};
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig
  });
  const response = await result.response;
  return response.text();
};
