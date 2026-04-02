export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const SEVERITY_COLORS = {
  '嚴重': '#ef4444',
  '一般': '#3b82f6',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'P0': 'bg-red-500 text-white border-red-600',
  'P1': 'bg-orange-100 text-orange-800 border-orange-200',
  'P2': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'P3': 'bg-green-100 text-green-800 border-green-200',
};

export const QA_FLOWS = ['待處理', '開發中', '已修正待測試', '已修復', '退回重修', '已關閉'];
export const PMS = ['Ian', 'Sienna'];
export const RDS = ['Neo', 'Summer', '后玲', 'Popo', 'Unassigned'];
export const MODULES = ['Presenter', 'Promoter', '企業組織', '雙模式', '全域設定', '其他'];

export const ADMIN_EMAILS: string[] = [
  'ian@osensetech.com',
  'sienna@osensetech.com',
];

export const STATUS_COLORS: Record<string, string> = {
  '已關閉': 'bg-gray-100 text-gray-600 border-gray-200',
  '已修復': 'bg-green-100 text-green-700 border-green-200',
  '已修正待測試': 'bg-teal-100 text-teal-700 border-teal-200',
  '退回重修': 'bg-red-500 text-white border-red-600',
  '開發中': 'bg-blue-100 text-blue-700 border-blue-200',
  '待處理': 'bg-slate-100 text-slate-700 border-slate-200',
};
