const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const fallbackModelName = process.env.GEMINI_FALLBACK_MODEL;
const model = genAI.getGenerativeModel({ model: modelName });
const fallbackModel = fallbackModelName && fallbackModelName !== modelName
  ? genAI.getGenerativeModel({ model: fallbackModelName })
  : null;

const generateWithRetry = async (targetModel, prompt) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await targetModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error?.status !== 503 || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
};

const askGemini = async (prompt) => {
  try {
    return await generateWithRetry(model, prompt);
  } catch (error) {
    if (![429, 503].includes(error?.status) || !fallbackModel) throw error;
    return generateWithRetry(fallbackModel, prompt);
  }
};

module.exports = { askGemini };
