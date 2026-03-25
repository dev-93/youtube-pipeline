import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "";
if (!apiKey) console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables.");
const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const generateContent = async (prompt: string) => {
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};
