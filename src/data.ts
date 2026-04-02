export interface QAItem {
  id: string;
  title?: string;
  priority?: string;
  date: string;
  module: string;
  tester: string;
  description: string;
  imageLink: string;
  imageLinks?: string[];
  videoLink?: string;
  videoLinks?: string[];
  currentFlow: string;
  assignee: string;
  fixVersion?: string;
  answer: string;
  rdFix?: string;
  testMethod?: string;
  comments?: QAComment[];
  commentCount?: number;
  fixedAt?: number;
  version?: string;
  authorUID?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachments?: { name: string, url: string }[];
  isNextRelease?: boolean;
  releaseNote?: string;
}

export interface QAComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
}

export const qaData: QAItem[] = [
  {
    id: "Q25",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Sienna",
    description: "【內部管理後台】根據目前的所有功能，建立內部管理後台(含會員資料、方案、訂單、點數、企業帳號、虛擬人、報表、log等)",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q46",
    priority: "P0",
    date: "3/24",
    module: "其他",
    tester: "Ian",
    description: "系統更新維護邏輯",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Summer",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q43",
    priority: "P0",
    date: "3/24",
    module: "其他",
    tester: "Ian",
    description: "修改項目：系統公告 / 版本更新通知功能\n#1｜DB Migration — 新增 announcements 表\n\nid\ntitle           -- 公告標題\ncontent         -- 公告內容\ntype            -- 'maintenance' / 'feature' / 'general'\ntarget_group    -- 'all' / 'business' / 'personal'\nis_active       -- 是否啟用\nstarts_at       -- 生效時間\nexpires_at      -- 過期時間（null = 永不過期）\ncreated_by      -- admin member_id\ncreated_at\n#2｜DB Migration — 新增 announcement_reads 表\n\nid\nmember_id       -- FK → members.id\nannouncement_id -- FK → announcements.id\nread_at\nUNIQUE(member_id, announcement_id)\n#3｜Admin API — 公告管理\n\n新增以下端點（需 Admin 權限）：\n\nPOST /admin/announcements — 建立公告\nPATCH /admin/announcements/{id} — 編輯 / 停用公告\nGET /admin/announcements — 列出所有公告（含已過期）\n受影響檔案：app/routers/admin.py\n\n#4｜前端 API — 取得未讀公告\n\n新增以下端點（需登入）：\n\nGET /announcements — 取得對該用戶有效的未讀公告\n依 target_group 過濾（all 全部看得到，business 只有企業帳號，personal 只有個人帳號）\n依 starts_at / expires_at 過濾\n排除已在 announcement_reads 有記錄的\nPOST /announcements/{id}/read — 標記已讀\n新增檔案：app/routers/announcements.py\n\n#5｜前端顯示 — Modal 彈窗（maintenance 類型）\n\n登入後呼叫 GET /announcements，若有 type = 'maintenance' 的未讀公告，優先以 Modal 彈出顯示。使用者關閉時呼叫 POST /announcements/{id}/read。\n\n#6｜前端顯示 — 通知鈴鐺（feature / general 類型）\n\n右上角新增通知 icon，顯示未讀數量紅點。點開展開公告列表，點單筆公告標記已讀。\n\n#7｜Admin 後台 — 公告管理介面\n\n在 Admin Panel 新增公告管理頁面，提供：\n\n建立 / 編輯 / 停用公告\n指定 type、target_group、生效與過期時間\n列出現有公告及各公告已讀人數統計\n受影響檔案：admin-panel/src/views/",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q29",
    priority: "P0",
    date: "3/20",
    module: "Promoter",
    tester: "Sienna",
    description: "【分鏡表/生成紀錄】\n圖轉影生完後，直接按各分鏡預覽的播放，會是有語音的影片。但跳去選image再選回video，再播放就會是沒有聲音的影片",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Summer",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q31",
    priority: "P0",
    date: "3/23",
    module: "Presenter",
    tester: "Sienna",
    description: "【匯出影片/虛擬人聲音】\n各分鏡的TTS聲音不一致 (可聽附檔00:40左右)",
    imageLink: "final_with_fadeout(1).mp4",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q33",
    priority: "P0",
    date: "3/23",
    module: "Presenter",
    tester: "Sienna",
    description: "【匯出影片/虛擬人對嘴】\n對嘴慢拍  (可聽附檔00:40後)",
    imageLink: "final_with_fadeout(1).mp4",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q32",
    priority: "P0",
    date: "3/23",
    module: "Presenter",
    tester: "Sienna",
    description: "【匯出影片/字幕斷行】\n字幕斷行不穩定，有時會斷在奇怪的地方 (如附檔影片00:16處)；該句字數過長時，頭尾的字也會被cut掉；字幕會重疊(附圖，下面那句是上一句，沒有消失，下一句就壓在上方)",
    imageLink: "IMG_6220.mp4\n截圖 2026-03-25 上午9.38.19.png",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q39",
    priority: "P0",
    date: "3/23",
    module: "Presenter",
    tester: "Sienna",
    description: "【字幕】\n客戶回報，右邊框起的字幕開關，已經關了但匯出影片仍會顯示文字",
    imageLink: "1774256461271.jpg",
    currentFlow: "待處理",
    assignee: "Summer",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q7",
    priority: "P0",
    date: "3/20",
    module: "Presenter",
    tester: "Ian",
    description: "字幕字元限制問題 — 需修復項目\n\n現況：\n\nscriptMaxLength 寫死 150，所有語言、所有模式統一限制\n預期規則：\n\n開啟圖轉影時：中文繁體/簡體/粵語、日文 → 150 字元，其他語言 → 300 字元\n未開啟圖轉影 → 無限制",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Summer",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q40",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "修改項目：企業主帳號改用 business_points 作為企業點數池\n背景\nbusiness_points 欄位目前只有子帳號在使用，母帳號該欄位永遠為 0。直接讓母帳號也用 business_points 存放企業點數，personal_points 只保留個人訂閱/平台贈點，兩者語意清楚且不需新增欄位。\n\n#1｜企業方案訂閱贈點改入 business_points\n\n受影響檔案：\n\napp/services/stripe_service.py — 第 322, 363, 426, 476 行\napp/services/ecpay_service.py — 第 382, 465, 517, 627 行\n修改方向：贈點時若帳號為 business Master，改加到 business_points；個人方案維持加到 personal_points。\n\n#2｜撥點 / 回收 / 刪除子帳號改用 master.business_points\n\n受影響檔案：\n\napp/routers/business_admin.py — 第 572–574, 628–634, 686–691, 1056–1072 行\n修改方向：\n\nallocate_points：從 master.business_points 扣點\nrecover_points：點數還回 master.business_points\ndelete_sub_account：回收點數還回 master.business_points\n所有餘額驗證改為檢查 master.business_points\n#3｜扣點邏輯新增母帳號走 business_points 的分支\n\n受影響檔案：\n\napp/routers/auth.py — 第 413–436 行\n修改方向：目前 is_business_sub 判斷有 parent_member_id is not None 才走 business_points。需新增：若為 business Master（account_type == 'business' 且 parent_member_id is NULL），使用功能時也從 business_points 扣點。\n\n#4｜管理員手動贈點區分欄位\n\n受影響檔案：\n\napp/routers/admin.py — 第 663 行\n修改方向：Admin 贈點 API 增加 target_pool 參數（personal / business），明確指定要加到哪個欄位。\n\n#5｜API Response 補上 business_points 欄位\n\n受影響檔案：\n\napp/schemas/auth.py — UserResponse\napp/routers/business_admin.py — Dashboard（第 308 行）、Summary（第 738 行）\n修改方向：Dashboard 分開回傳 personal_points（個人訂閱點數）與 business_points（企業點數池）供前端分別顯示。\n\n#6｜Admin 後台統計與顯示分離\n\n受影響檔案：\n\napp/routers/admin.py — 第 678, 704, 761, 832 行\nadmin-panel/src/views/PointsView.vue\nadmin-panel/src/views/BusinessAccountsView.vue\n修改方向：統計 API 分開計算並顯示 total_personal_points 與 total_business_points。",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q45",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "需求項目：新增 Avatar — 川總（雄獅專屬）\n#1｜上傳縮圖\n\n從以下連結下載圖片，上傳至前端靜態目錄，命名為 /avatar/A1009-1.png：\nhttps://drive.google.com/file/d/1MWqiduajwd_0F0uuDuglzsMLFxQVolGO/view?usp=sharing\n\n#2｜SQL 新增 Avatar\n\nINSERT INTO avatars (id, name, gender, training_id_left, training_id_right, img_path, is_active, master_member_id, created_at, updated_at)\nVALUES (\n    gen_random_uuid(),\n    '川總',\n    'male',\n    '48577',\n    '48573',\n    '/avatar/A1009-1.png',\n    true,\n    6332,\n    now(),\n    now()\n);\n#3｜IndexTTS Server — 新增聲音設定\n\n在 soli-tts-clone-server 的 voice config 新增以下設定：\n\n\"liontravel_trump\": {\n    \"name\": \"liontravel_trump\",\n    \"description\": \"上傳於 2026/01/28 上午8:59:35\",\n    \"audio_paths\": [\n      \"/home/user/soli-tts-clone-server/voices/liontravel_trump.mp3\"\n    ],\n    \"seed\": 8,\n    \"language\": \"zh\"\n}\n#4｜SQL 新增 Custom Voice 綁定雄獅\n\nINSERT INTO custom_voices (id, master_member_id, voice_id, name, type, is_active, created_at, updated_at)\nVALUES (\n    gen_random_uuid(),\n    6332,\n    'liontravel_trump',\n    '川總',\n    'index_tts',\n    true,\n    now(),\n    now()\n);\n確認項目\n\nSELECT name, training_id_left, training_id_right, img_path, master_member_id\nFROM avatars WHERE name = '川總' AND master_member_id = 6332;\n\nSELECT voice_id, name, type, master_member_id\nFROM custom_voices WHERE voice_id = 'liontravel_trump';",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q44",
    priority: "P0",
    date: "3/24",
    module: "其他",
    tester: "Ian",
    description: "需求項目：更新 Avatar — Joseph（A4）\n更新對象\n\n欄位\t值\nid\te9aaa3e7-f898-4301-b26c-61cd84b5060f\nname\tJoseph\nimg_path\t/avatar/A4-1.png\n#1｜更新縮圖\n\n從以下連結下載圖片，覆蓋替換 /avatar/A4-1.png：\nhttps://drive.google.com/file/d/1IyeDEBHcIRQNMORiqgHNUCVZRdD76wXI/view?usp=sharing\n\n#2｜執行 SQL 更新 Training ID\n\nUPDATE avatars\nSET\n    training_id_left  = '54394',\n    training_id_right = '54395',\n    updated_at = now()\nWHERE id = 'e9aaa3e7-f898-4301-b26c-61cd84b5060f';\n確認項目\n\n執行後用以下 SQL 驗證：\n\nSELECT name, gender, training_id_left, training_id_right, img_path\nFROM avatars\nWHERE id = 'e9aaa3e7-f898-4301-b26c-61cd84b5060f';",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q42",
    priority: "P0",
    date: "3/24",
    module: "其他",
    tester: "Sienna",
    description: "【訂閱方案頁/發票資訊】\n1. 個人的發票開立方式，載具類型中「紙本發票(寄送Email)」請改文字為「電子發票(寄送Email)」、「自然人憑證」請拿掉；也請確認是否有綠界會員的歸戶選項\n2. 手機欄位，增加半形數字判斷 (否則綠界後台會出現錯誤而無法開發票)\n3. 請確認「公司」的「公司名稱」是否帶到姓名的值，綠界後台該欄位出現用戶姓名，發票開立會有錯誤，目前後台看沒有看到帶到這個值\n4. 確認舊會員的定期定額訂單，發票串接有成功 (目前有兩筆交易有問題，一筆有交易沒發票、一筆海外交易失敗)\n5.若選手機條碼，填寫手機條碼欄位後須確認是否有寫入後台，目前後台看沒有看到帶到這個值",
    imageLink: "截圖 2026-03-24 下午1.55.25.png",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q26",
    priority: "P0",
    date: "3/20",
    module: "Presenter",
    tester: "Sienna",
    description: "【分鏡表/圖轉影】\n生成逾時的失敗，沒有返點",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Neo",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q1",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "企業組織專案歸屬問題 — 需修復項目\n\nEditor 被移除組織後，其在組織內建立的專案仍歸屬於自己，應轉移給同部門 Admin，若無 Admin 則轉給 Master\nEditor 被移除後，已匯出的影片（GeneratedVideo）也應隨專案一起轉移\nEditor 被停用期間，Master/Admin 無法查看該 Editor 的專案\nMaster 目前無法查看所有子帳號的專案列表，應可查看組織內所有專案\nAdmin 目前無法查看同部門 Editor 的專案，應可查看同部門的專案",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q21",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-表單】檔案上傳無大小驗證（前端） — 品牌文件、產品圖片均無前端大小檢查，可上傳超大檔案（PromoterMode.vue）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q28",
    priority: "P0",
    date: "3/20",
    module: "雙模式",
    tester: "Sienna",
    description: "要把系統中會跳第三方服務(gemini)、或跟流程/做法有關的提示換句話說",
    imageLink: "截圖 2026-03-20 下午5.56.51.png",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q34",
    priority: "P0",
    date: "3/23",
    module: "其他",
    tester: "Sienna",
    description: "【會員資料頁/訂閱方案】\n個人帳號加購點數，目前是會員即可購點，需改成要先是「訂閱身份」才能加購",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q6",
    priority: "P0",
    date: "3/20",
    module: "雙模式",
    tester: "Ian",
    description: "影片預覽播放列無法拖曳問題 — 需修復項目\n\n現況問題：\n\n分鏡預覽（小影片）和「儲存並預覽」Modal（大影片）都有部分影片無法自由拖曳進度條\n可能原因：\n\n.video-preview 容器設了 overflow: hidden（PresenterClipEditor.vue:7570），影片比例與容器不一致時（如 9:16 影片在 16:9 容器），原生控制列可能被裁切或點擊區域被遮擋\nAvatar overlay 層（z-index: 2）雖有 pointer-events: none，但在某些瀏覽器或觸控裝置上仍可能干擾 controls 區域\n短片段（5-15 秒）的瀏覽器原生 seekbar 拖曳精度差，且影片若未完全載入（progressive download），seekbar 會限制只能拖到已緩衝的範圍\n建議修法：\n\n檢查 .video-preview 的 overflow: hidden 是否裁切到 controls 區域，改為 overflow: visible 或增加底部 padding 讓 controls 不被裁切\nModal 大影片的 .preview-video-wrapper（position: relative）確認 Avatar overlay 的 bottom: 40px 是否蓋住了 controls bar 的點擊區域\n若原生 controls 在不同影片格式上表現不一致，考慮改用自訂播放器元件（如 video.js 或純 CSS/JS 自製 seekbar），統一控制體驗",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q3",
    priority: "P0",
    date: "3/20",
    module: "Presenter",
    tester: "Ian",
    description: "Logo 浮水印問題 — 需修復項目\n\n前端 Logo 上傳區沒有「刪除」按鈕，用戶上傳後只能覆蓋、無法移除\n後端沒有刪除 project.brand_logo_path 的 API 端點",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q4",
    priority: "P0",
    date: "3/20",
    module: "全域設定",
    tester: "Ian",
    description: "TTS 試聽體驗優化 — 建議做法（供 RD 參考）\n\n現況問題：\n\n前端試聽呼叫 GET /voices/tts/preview/{voice_id}，後端即時呼叫 Gemini/Azure 生成音檔再回傳\n生成時間 2-5 秒不等，偶爾會失敗\npublic/voice-samples/ 已有 175 個預錄 MP3 但沒被使用\n建議做法：\n\n前端直接讀取靜態預錄檔（零延遲，最優先）\n\nGemini 語音：直接播放 /voice-samples/{voiceId}_{language}.mp3\n命名規則已存在，例如 Kore_zh-TW.mp3、Charon_en.mp3\n前端 previewVoice() 改為先檢查靜態檔是否存在，存在就直接播放，不打 API\nAPI 作為 fallback（靜態檔不存在時才用）\n\n新增的 Azure 語音沒有預錄檔，此時才走 API 即時生成\n後端生成後應自動存檔到 voice-samples/，下次就變成靜態檔\n新增語音時自動生成預錄檔\n\n寫入 tts_voices 資料表後，自動跑 generate_voice_previews.py 生成對應語言的預覽音檔\n或在 API 端加 cache：第一次生成後存到 voice-samples/，後續直接回傳",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q2",
    priority: "P0",
    date: "3/20",
    module: "Presenter",
    tester: "Ian",
    description: "畫質設定問題 — 需修復項目\n\nfinal_preview_tasks.py 和 final_export_tasks.py 合併場景時，沒有讀取 project.quality 做輸出解析度 scale，導致選 720p 仍可能輸出 1080p（或反過來）\n用戶在編輯器中切換畫質後，已生成的場景影片不會重新生成，新的畫質只對「之後生成的場景」生效\n建議修法（供 RD 參考）：\n\n在 final preview / final export 的 ffmpeg concat 階段，根據 project.quality 加上 -vf scale=1280:720（720p）或 -vf scale=1920:1080（1080p），統一輸出解析度\n這樣不需要重新生成場景影片，只在最終合併時 scale 即可",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q5",
    priority: "P0",
    date: "3/20",
    module: "全域設定",
    tester: "Ian",
    description: "預估影片長度問題 — 建議做法（供 RD 參考）\n\n現況問題：\n\n目前 totalDurationSeconds 的計算邏輯：有 audioDuration 就用，沒有就用文字長度估算（每 15 字 ≈ 1 秒）\n估算不準確，且用戶會以為顯示的是實際長度\n建議修改（前端 PresenterClipEditor.vue + PromoterClipEditor.vue）：\n\ntotalDurationSeconds 改為只加總有 audioDuration 的場景，移除文字估算 fallback\n新增 allClipsHaveDuration 判斷：所有場景都有 audioDuration 才算完成\nestimatedDuration 顯示邏輯改為：\n全部場景都有 duration → 顯示加總時間（如 2m 30s）\n部分或全部沒有 → 顯示「需執行所有分鏡後才能預估」",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q8",
    priority: "P0",
    date: "3/20",
    module: "Promoter",
    tester: "Ian",
    description: "智能配樂設定問題 — 需修復項目\n\n現況：\n\nPromoterMode 建立專案時，smart_bgm 有正確傳到後端並存入 DB\nPromoterClipEditor 載入時，globalSettings.bgmEnabled 預設為 true，沒有讀取 project.smart_bgm 的值\n導致取消勾選智能配樂後，進到編輯器配樂仍為開啟\n修法：\n\nPromoterClipEditor.vue 載入專案時（約第 4370 行），加入 smart_bgm 判斷：\n// 先讀 smart_bgm 設定\nif (response.smart_bgm === false) {\n  globalSettings.bgmEnabled = false\n}\n// 再讀 bgm_id（有選過特定 BGM 則覆蓋）\nif (response.bgm_id) {\n  globalSettings.selectedBgm = response.bgm_id\n  globalSettings.bgmEnabled = true\n}",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q9",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P0-認證】密碼重設強度不一致 — 註冊要求8-20字元+英數混合，但重設密碼只要6字元，用戶可設超弱密碼如123456（auth.py:251）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q10",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P0-認證】密碼重設Token可重複使用 — Token用過後不失效，洩漏可無限次重設密碼（auth.py:334-350）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q11",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P0-付費】ECPay回呼未驗證金額 — callback只驗簽章不驗金額，攻擊者可篡改金額通過驗證，造成財務損失（ecpay_service.py:243-313）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q12",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P0-付費】點數扣除無交易鎖定 — 兩個並行請求可同時通過餘額檢查，造成點數透支（auth.py:379-449）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q13",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P0-付費】ECPay雙重扣款漏洞 — 兩個相同callback同時到達可重複發放點數（ecpay_service.py:293-296）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q14",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P0-安全】API Key硬編碼在程式碼中 — Gemini、Azure、ECPay金鑰寫在config.py而非環境變數，原始碼外洩即金鑰外洩（config.py:18,21,35,50-51）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q24",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Sienna",
    description: "點數計算不一致問題 — 需修復項目\n\n現況：\n\n「已分配」只算企業點數（allocated_points）\n「本月消耗」算所有點數消耗（PointLog.points_deducted，含個人點數和企業點數）\n兩個數字來源不同，會出現消耗 > 分配的矛盾\n建議修法：\n\n_get_monthly_usage 應只計算企業點數的消耗，過濾條件加上只算 business_points 來源的扣除\n或在 PointLog 新增欄位 source（business / personal），記錄這筆扣除是從哪個點數池扣的，查詢時篩選 source='business'",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q41",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "修改項目：MongoDB 推薦關係資料移轉至 member_referrals\n#1｜建立 email 對照表\n\n從 MongoDB users.account（email）對應到 PostgreSQL members.id，產出一份 ObjectId → member_id 的對照表，供後續步驟使用。\n\n無法對應的 email（MongoDB 有但 PostgreSQL 找不到）需另外記錄，確認是否要補建帳號。\n\n#2｜計算每個 user 的 redeem_level\n\n從 MongoDB user_links 遞迴往上追推薦鏈，計算每個 user 的深度：\n\n沒有被推薦過（is_linked_referral_code = false）→ level 0\n被 level 0 推薦 → level 1，以此類推\n#3｜寫入 member_referrals\n\n來源對應：\n\nmember_referrals 欄位\tMongoDB 來源\nparent_id\tuser_links.linked_user_id → 對照表 → members.id\nchild_id\tuser_links.user_id → 對照表 → members.id\nparent_redeem_level\t#2 計算結果（parent 的 level）\nchild_redeem_level\tparent level + 1\ncreated_at\tuser_links.created_at\n加上 ON CONFLICT (child_id) DO NOTHING 避免重複寫入。\n\n#4｜同步更新 members 表\n\n寫入完成後，更新 PostgreSQL members 的冗餘欄位：\n\nredeem_level → 對應 #2 計算出的 level\nhas_redeemed → 有 user_links 記錄的設為 true",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q15",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-安全】無任何API限流 — 登入、註冊、密碼重設等端點均無Rate Limiting，可被暴力破解（全域）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q16",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-安全】CORS過度開放 — 包含HTTP明文來源+allow_methods=*+allow_credentials=True，CSRF攻擊風險（main.py:38-52）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q17",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-認證】註冊無信箱驗證 — 用戶可用任意信箱註冊，無驗證信機制，帳號冒用風險（auth_service.py:265）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q18",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-企業帳號】企業邀請Token端點無需認證 — 公開暴露企業名稱、部門、點數資訊（business_admin.py:985）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q19",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-企業帳號】點數分配Race Condition — 兩個並行分配請求可超額分配Master點數（business_admin.py:607-658）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q20",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-付費】訂閱到期僅在用戶登入時檢查 — 離線用戶訂閱不會被降級直到下次登入，可免費延長（ecpay_service.py:404-512）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q22",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-表單】表單重複提交未防護 — 建立專案按鈕無loading/disabled狀態，可重複點擊建立多個專案（PromoterMode.vue:1392）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q23",
    priority: "P0",
    date: "3/20",
    module: "其他",
    tester: "Ian",
    description: "【P1-表單】官網URL未驗證 — URL欄位標記必填但goToNextStep()未檢查格式，無效URL存入DB（PromoterMode.vue:959）",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q30",
    priority: "P0",
    date: "3/20",
    module: "雙模式",
    tester: "Sienna",
    description: "所有影片播放的右下角「下載」功能要隱藏，不開放以這個方式下載",
    imageLink: "截圖 2026-03-20 下午6.20.22.png",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q35",
    priority: "P0",
    date: "3/23",
    module: "雙模式",
    tester: "Sienna",
    description: "【背景音樂BGM】\n自己上傳音樂功能沒有作用",
    imageLink: "",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q37",
    priority: "P0",
    date: "3/23",
    module: "Promoter",
    tester: "Sienna",
    description: "【腳本生成】\n「影片生成中」，請改成「腳本生成中」",
    imageLink: "截圖 2026-03-23 下午5.53.14.png",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  },
  {
    id: "Q47",
    priority: "P0",
    date: "3/25",
    module: "Presenter",
    tester: "Sienna",
    description: "【影片預覽】\n目前測試，分鏡40個以上、影片總長度15-20分鐘，預覽會失敗，訊息如附圖",
    imageLink: "截圖 2026-03-25 中午12.48.35.png",
    currentFlow: "待處理",
    assignee: "Unassigned",
    fixVersion: "",
    answer: ""
  }
];
