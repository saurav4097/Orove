// geminiHandler.js

require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GENAI_API_KEY;
if (!apiKey) {
  throw new Error("GENAI_API_KEY not found in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getGeminiResponse(userMessage) {
  if (!userMessage || typeof userMessage !== "string") {
    throw new Error("Invalid input for Gemini");
  }

  try {
    const result = await model.generateContent(userMessage);
    console.log("Gemini raw result:", result);

   const raw = result.response.text?.();
const response = raw?.trim();

if (!response) {
  return "No response from Gemini";
}

return response;


  } catch (err) {
    console.error("Gemini API error:", err.message);
    throw err;
  }
}

module.exports = { getGeminiResponse };
