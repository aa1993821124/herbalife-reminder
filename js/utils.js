// ═══════════════════════════════════════
// Easyfit CRM — 工具函式
// ═══════════════════════════════════════

function formatDate(dt) {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = d - now;
  const days = Math.floor(diff / 86400000);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  if (days === 0) return `今天 ${h}:${m}`;
  if (days === 1) return `明天 ${h}:${m}`;
  if (days === -1) return `昨天 ${h}:${m}`;
  if (days > 1 && days <= 7) return `${days}天後 ${h}:${m}`;
  return `${month}/${day} ${h}:${m}`;
}

function formatDateOnly(dt) {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getTypeInfo(typeId) {
  return CONFIG.REMINDER_TYPES.find(t => t.id === typeId) || CONFIG.REMINDER_TYPES[5];
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateICS(client, summary, description) {
  const now = new Date();
  const start = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(now.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
    `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
}

function downloadICS(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Toast ──
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2200);
}
