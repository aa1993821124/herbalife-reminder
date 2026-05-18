// ═══════════════════════════════════════
// Easyfit CRM — 設定檔
// 部署後只需改這個檔案
// ═══════════════════════════════════════

const CONFIG = {
  // ── 把你的 Apps Script Web App URL 貼在這裡 ──
  // 部署方式：Apps Script → 部署 → 新增部署 → 網路應用程式 → 複製 
  API_URL:'https://script.google.com/macros/s/AKfycbzozmsyEGNm2BnqA5CoTaIpwJeOzScBPF0jSN8sJ-Xf4orIFjii4lRK-Np1pOOIM-qh/exec',

  // ── 賀寶芙產品清單（可自行增減）──
  PRODUCTS: [
    'Formula 1 營養蛋白混合飲料',
    'Formula 2 綜合維他命',
    'Formula 3 細喜錠',
    '賀寶芙茶飲',
    '蘆薈汁',
    '纖體細喜餐',
    '營養活力飲品',
    '其他產品',
  ],

  // ── 提醒類型 ──
  REMINDER_TYPES: [
    { id: 'follow_up',    label: '售後跟進', icon: '📞', color: '#F59E0B' },
    { id: 'reorder',      label: '回購提醒', icon: '🔄', color: '#10B981' },
    { id: 'birthday',     label: '生日祝福', icon: '🎂', color: '#EC4899' },
    { id: 'health_check', label: '健康追蹤', icon: '💚', color: '#22C55E' },
    { id: 'product_intro', label: '新品推薦', icon: '🌟', color: '#8B5CF6' },
    { id: 'custom',       label: '自訂提醒', icon: '📝', color: '#6366F1' },
  ],

  // ── 觸發動作選項 ──
  ACTIONS: [
    { id: '',         label: '僅提醒（無動作）' },
    { id: 'calendar', label: '📅 加入行事曆' },
    { id: 'email',    label: '✉️ 發送 Email' },
    { id: 'call',     label: '📞 撥打電話' },
    { id: 'line',     label: '💬 LINE 傳訊' },
  ],

  // ── LINE OA 相關 ──
  LINE_OA_ID: '@easyfit', // 你的 LINE OA ID
};
