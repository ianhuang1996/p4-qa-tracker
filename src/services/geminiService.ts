import { GoogleGenAI, Type } from "@google/genai";
import { QAItem, QAComment } from "../data";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const summarizeDiscussion = async (item: QAItem, comments: QAComment[]) => {
  if (comments.length === 0) return "目前尚無討論。";
  
  const prompt = `
    請摘要以下 QA 項目的討論進度：
    標題：${item.title || "未命名"}
    敘述：${item.description}
    
    討論內容：
    ${comments.map(c => `${c.userName}: ${c.text}`).join('\n')}
    
    請用簡短的條列式總結目前的共識、待處理事項或爭議點。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "無法生成摘要。";
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    return "摘要生成失敗。";
  }
};
