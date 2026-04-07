import { GoogleGenAI } from "@google/genai";
import { QAItem, QAComment } from "../data";
import { AugmentedQAItem } from "../types";

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

export const generateReleaseNotes = async (version: string, items: AugmentedQAItem[]) => {
  if (items.length === 0) return "此版本沒有關聯的項目。";

  const itemList = items.map(i =>
    `- [${i.priority}] ${i.id}: ${i.displayTitle}（模組: ${i.module}, 負責人: ${i.assignee}）`
  ).join('\n');

  const prompt = `
你是一位軟體產品的 PM，請根據以下 QA 修復項目清單，產生一份簡潔專業的 Release Note。

版本號: ${version}
修復項目:
${itemList}

格式要求:
1. 用繁體中文撰寫
2. 按模組分組（例如 Presenter、Promoter、企業組織、後台等）
3. 每個項目一行，簡述修復內容
4. 開頭加一段總結（1-2 句話說明此版本重點）
5. 使用 Markdown 格式
6. 不要加版本號標題（已經有了）
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "無法生成 Release Note。";
  } catch (error) {
    console.error("Gemini Release Note Error:", error);
    return "Release Note 生成失敗，請確認 Gemini API Key 設定。";
  }
};
