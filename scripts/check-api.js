const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const checkModels = async () => {
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
    // Wait, listModels is on the genAI instance or something else?
    // In SDK 0.24.1, there might not be a direct listModels.
    // Let's try to just check if 'gemini-1.5-flash' works with a simple prompt.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log('Success:', result.response.text());
  } catch (err) {
    console.error('Error:', err.message);
    if (err.status) console.log('Status:', err.status);
  }
};

checkModels();
