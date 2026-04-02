import streamlit as st
import pandas as pd
import re
import io

# 設定頁面標題與寬度
st.set_page_config(page_title="P4 每週版更 QA 追蹤系統", layout="wide")

st.title("P4 每週版更 QA 追蹤系統與數據分析工具")

# 讀取並解析資料
@st.cache_data
def load_data():
    # 讀取 TSV 檔案
    df = pd.read_csv("qa_data.tsv", sep="\t", dtype=str)
    
    # 填補空值
    df.fillna("", inplace=True)
    
    # 使用 Regex 確保編號格式正確 (例如 Q 加上數字)
    # 這裡我們保留原始編號，但可以做一些清洗
    df['編號'] = df['編號'].apply(lambda x: x.strip() if re.match(r'^Q.*', str(x)) else x)
    
    # 清理負責人欄位，將空值設為 'Unassigned'
    df['負責人'] = df['負責人'].apply(lambda x: x.strip() if x.strip() != "" else "Unassigned")
    
    return df

try:
    df = load_data()
except Exception as e:
    st.error(f"無法讀取資料: {e}")
    st.stop()

# --- 儀表板 (Dashboard) ---
st.header("📊 儀表板")

col1, col2, col3 = st.columns(3)

# 1. 顯示各負責人目前的任務總數
with col1:
    st.subheader("各負責人任務總數")
    assignee_counts = df['負責人'].value_counts().reset_index()
    assignee_counts.columns = ['負責人', '任務數']
    st.dataframe(assignee_counts, hide_index=True, use_container_width=True)

# 2. 統計「嚴重」與「一般」問題的比例
with col2:
    st.subheader("嚴重程度比例")
    severity_counts = df['問題狀態'].value_counts().reset_index()
    severity_counts.columns = ['嚴重程度', '數量']
    st.bar_chart(severity_counts.set_index('嚴重程度'))

# 3. 顯示各模組的分佈
with col3:
    st.subheader("各模組分佈")
    module_counts = df['模組'].value_counts().reset_index()
    module_counts.columns = ['模組', '數量']
    st.bar_chart(module_counts.set_index('模組'))

st.divider()

# --- 互動式表格與篩選 ---
st.header("📋 QA 列表與篩選")

# 篩選器
filter_col1, filter_col2, filter_col3, filter_col4 = st.columns(4)

with filter_col1:
    status_options = ["全部"] + list(df['當前問題流向'].unique())
    selected_status = st.selectbox("狀態 (當前問題流向)", status_options)

with filter_col2:
    assignee_options = ["全部"] + list(df['負責人'].unique())
    selected_assignee = st.selectbox("負責人", assignee_options)

with filter_col3:
    severity_options = ["全部"] + list(df['問題狀態'].unique())
    selected_severity = st.selectbox("嚴重程度", severity_options)

with filter_col4:
    search_query = st.text_input("🔍 搜尋問題敘述")

# 應用篩選
filtered_df = df.copy()

if selected_status != "全部":
    filtered_df = filtered_df[filtered_df['當前問題流向'] == selected_status]

if selected_assignee != "全部":
    filtered_df = filtered_df[filtered_df['負責人'] == selected_assignee]

if selected_severity != "全部":
    filtered_df = filtered_df[filtered_df['問題狀態'] == selected_severity]

if search_query:
    filtered_df = filtered_df[filtered_df['問題敘述'].str.contains(search_query, case=False, na=False)]

st.write(f"共找到 {len(filtered_df)} 筆結果")
st.dataframe(filtered_df, use_container_width=True)

# --- 匯出功能 ---
# 將 DataFrame 轉換為 CSV
csv = filtered_df.to_csv(index=False).encode('utf-8-sig')
st.download_button(
    label="📥 匯出過濾後的結果為 CSV",
    data=csv,
    file_name='qa_filtered_data.csv',
    mime='text/csv',
)

st.divider()

# --- 詳細檢視 ---
st.header("🔍 詳細檢視")
st.write("請選擇要查看詳細內容的 QA 編號：")

selected_q_id = st.selectbox("選擇編號", filtered_df['編號'].tolist())

if selected_q_id:
    detail_data = filtered_df[filtered_df['編號'] == selected_q_id].iloc[0]
    
    st.subheader(f"[{detail_data['編號']}] {detail_data['模組']} - {detail_data['問題狀態']}")
    
    col_det1, col_det2 = st.columns(2)
    with col_det1:
        st.write(f"**負責人:** {detail_data['負責人']}")
        st.write(f"**測試人員:** {detail_data['測試人員']}")
        st.write(f"**測試日期:** {detail_data['測試日期']}")
    with col_det2:
        st.write(f"**當前問題流向:** {detail_data['當前問題流向']}")
        st.write(f"**修正版號:** {detail_data['修正版號']}")
        st.write(f"**圖檔連結:** {detail_data['圖檔連結']}")
    
    st.markdown("### 問題敘述")
    # 使用 code block 或 markdown 顯示，保留換行
    st.text(detail_data['問題敘述'])
    
    if detail_data['問題解答 by 開發人員/PM']:
        st.markdown("### 問題解答")
        st.text(detail_data['問題解答 by 開發人員/PM'])
