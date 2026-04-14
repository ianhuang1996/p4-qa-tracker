import { GoogleGenAI } from "@google/genai";
import { QAItem, QAComment, AugmentedQAItem, TodoItem, Release } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

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
你是一位軟體產品的 PM，請根據以下 QA 項目清單，產生一份對外的版更通知。
這是給用戶看的，語言要簡潔易懂，不要使用內部術語或 bug 編號。

版本號: ${version}
項目清單:
${itemList}

請嚴格按照以下格式輸出，分為三個區塊：

🎬 新功能

（如果有新功能項目，每個一行，用「功能名稱：一句話說明」格式。沒有就寫「本次無新功能」）

⚡ 優化

（如果有優化項目，每個一行，用「功能名稱：一句話說明」格式。沒有就寫「本次無優化項目」）

🐛 修復

（修復項目，每個一行，簡述修正了什麼。不要帶 Q 編號）

規則：
- 繁體中文
- 每個項目獨立一行，前面不要加符號或編號
- 項目之間用空行分隔
- 不要太細節，用戶看得懂就好
- 根據項目內容判斷歸類到新功能、優化還是修復
- 不要加版本號標題
- 不要用 Markdown 語法（# ## * -），用純文字
- 不要加額外的開頭總結
- 三個區塊之間用空行分隔
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

export interface MeetingSummary {
  keyPoints: string[];
  suggestedActions: string[];
}

export const summarizeMeeting = async (
  title: string,
  type: string,
  attendees: string[],
  notes: string,
): Promise<MeetingSummary> => {
  const prompt = `你是一個會議助理，請根據以下會議資訊，用繁體中文產生摘要。

會議標題：${title || '（未命名）'}
會議類型：${type === 'client' ? '客戶會議' : '組內討論'}
出席者：${attendees.length > 0 ? attendees.join('、') : '未填寫'}

會議紀錄：
${notes.trim() || '（無紀錄內容）'}

請嚴格回傳以下 JSON 格式，不要加任何其他文字：
{
  "keyPoints": ["重點1", "重點2"],
  "suggestedActions": ["行動項目1", "行動項目2"]
}

規則：
- keyPoints：3～5 條條列式重點摘要
- suggestedActions：從紀錄中提取需要跟進的行動，若無則回傳空陣列
- 若紀錄內容太少，keyPoints 填一條說明即可`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text ?? '{"keyPoints":[],"suggestedActions":[]}') as MeetingSummary;
  } catch (error) {
    console.error('Gemini Meeting Summary Error:', error);
    throw error;
  }
};

interface DailyReportInput {
  date: string;
  completedTodos: string[];
  completedQAItems: { id: string; title: string; module: string }[];
  inProgressQAItems: { id: string; title: string; module: string; assignee: string }[];
  pendingTodos: string[];
  riskItems: { id: string; title: string; reason: string }[];
  activeRelease?: { version: string; scheduledDate: string; itemCount: number };
  manualNotes?: string;
}

export const generateDailyReport = async (input: DailyReportInput): Promise<{ completed: string; inProgress: string; risks: string }> => {
  const sections: string[] = [];

  sections.push(`日期: ${input.date}`);

  if (input.completedTodos.length > 0) {
    sections.push(`今日完成的待辦:\n${input.completedTodos.map(t => `- ${t}`).join('\n')}`);
  }
  if (input.completedQAItems.length > 0) {
    sections.push(`今日修復/關閉的 QA 項目:\n${input.completedQAItems.map(q => `- ${q.id}: ${q.title} (${q.module})`).join('\n')}`);
  }
  if (input.inProgressQAItems.length > 0) {
    sections.push(`目前開發中的 QA 項目:\n${input.inProgressQAItems.map(q => `- ${q.id}: ${q.title} (${q.module}, 負責: ${q.assignee})`).join('\n')}`);
  }
  if (input.pendingTodos.length > 0) {
    sections.push(`未完成的待辦:\n${input.pendingTodos.map(t => `- ${t}`).join('\n')}`);
  }
  if (input.riskItems.length > 0) {
    sections.push(`風險項目:\n${input.riskItems.map(r => `- ${r.id}: ${r.title} — ${r.reason}`).join('\n')}`);
  }
  if (input.activeRelease) {
    sections.push(`即將發布: ${input.activeRelease.version}，預計 ${input.activeRelease.scheduledDate}，包含 ${input.activeRelease.itemCount} 個項目`);
  }
  if (input.manualNotes) {
    sections.push(`PM 補充:\n${input.manualNotes}`);
  }

  const prompt = `
你是一位軟體團隊的 PM，請根據以下今日工作資料，產生一份簡潔專業的每日進度報告，給主管看的。

${sections.join('\n\n')}

請輸出三個區塊，用 --- 分隔。

重要規則：
- 每個區塊直接寫內容，不要加任何標題（不要寫「今日完成：」「進行中：」等標題文字，我會自己加）
- 直接從列表項目開始

第一區塊：
- 總結今天完成了什麼，按類別分組（如前端修復、後台功能等）
- 如果有 QA items，用 Q 編號列出
- 簡潔扼要，每點一行

---

第二區塊：
- 列出目前還在進行的工作和明天要做的重點
- 如果有版更排程，提及時程

---

第三區塊：
- 列出潛在風險（P0 未修、被退回的、逾期的）
- 如果沒有風險就寫「目前無重大風險」

要求：
- 繁體中文
- 語氣專業但簡潔
- 每個區塊 3-6 行即可
- 不要用 Markdown 標題語法（# ##），用純文字 + 列表（-）
- 不要在每個區塊開頭重複寫區塊標題
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const text = response.text || '';
    const parts = text.split('---').map(s => s.trim());
    return {
      completed: parts[0] || '今日無完成項目',
      inProgress: parts[1] || '無進行中項目',
      risks: parts[2] || '目前無重大風險',
    };
  } catch (error) {
    console.error("Gemini Daily Report Error:", error);
    return {
      completed: '報告生成失敗，請手動填寫',
      inProgress: '',
      risks: '',
    };
  }
};
