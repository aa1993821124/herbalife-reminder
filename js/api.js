// ═══════════════════════════════════════
// Easyfit CRM — API Layer
// 串接 Google Apps Script Web App
// 如果未設定 API_URL 則用 localStorage 離線模式
// ═══════════════════════════════════════

const API = {
  // ── 判斷是否已連接後端 ──
  isConnected() {
    return CONFIG.API_URL && CONFIG.API_URL.length > 10;
  },

  // ── GET 請求 ──
  async get(action) {
    if (!this.isConnected()) return this._localGet(action);
    try {
      const res = await fetch(`${CONFIG.API_URL}?action=${action}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('API GET 失敗:', err);
      return this._localGet(action);
    }
  },

  // ── POST 請求 ──
  async post(body) {
    if (!this.isConnected()) return this._localPost(body);
    try {
      const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      console.error('API POST 失敗:', err);
      return this._localPost(body);
    }
  },

  // ════════════════════════════════════════
  // 離線模式（localStorage）
  // ════════════════════════════════════════

  _store(key, val) { localStorage.setItem('easyfit_' + key, JSON.stringify(val)); },
  _load(key) { try { return JSON.parse(localStorage.getItem('easyfit_' + key)) || []; } catch { return []; } },

  _localGet(action) {
    switch (action) {
      case 'getClients': return this._load('clients');
      case 'getAdmins': return this._load('admins');
      case 'getRules': return this._load('rules');
      case 'getReminders': return this._load('reminders');
      case 'getDashboard': {
        const clients = this._load('clients');
        const reminders = this._load('reminders');
        return {
          total: clients.length,
          pending: reminders.filter(r => !r.done && new Date(r.datetime) >= new Date()).length,
          overdue: reminders.filter(r => !r.done && new Date(r.datetime) < new Date()).length,
          completed: reminders.filter(r => r.done).length,
        };
      }
      default: return [];
    }
  },

  _localPost(body) {
    switch (body.action) {
      case 'addClient': {
        const clients = this._load('clients');
        const newClient = {
          id: 'C' + Date.now(),
          name: body.name,
          phone: body.phone || '',
          email: body.email || '',
          lineId: body.lineId || '',
          products: body.products || '',
          purchaseDate: body.purchaseDate || '',
          adminId: body.adminId || '',
          adminName: body.adminName || '',
          store: body.store || '',
          source: body.source || '',
          notes: body.notes || '',
          createdAt: new Date().toISOString(),
          reminders: [],
        };
        clients.unshift(newClient);
        this._store('clients', clients);
        return { success: true, clientId: newClient.id };
      }
      case 'updateClient': {
        let clients = this._load('clients');
        clients = clients.map(c => c.id === body.clientId ? { ...c, ...body.data } : c);
        this._store('clients', clients);
        return { success: true };
      }
      case 'deleteClient': {
        let clients = this._load('clients');
        clients = clients.filter(c => c.id !== body.clientId);
        this._store('clients', clients);
        return { success: true };
      }
      case 'addReminder': {
        let clients = this._load('clients');
        const reminder = {
          id: 'R' + Date.now() + Math.random().toString(36).slice(-4),
          type: body.type,
          datetime: body.datetime,
          note: body.note || '',
          action: body.action_type || '',
          done: false,
          createdAt: new Date().toISOString(),
        };
        clients = clients.map(c => {
          if (c.id === body.clientId) {
            c.reminders = c.reminders || [];
            c.reminders.push(reminder);
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true, reminderId: reminder.id };
      }
      case 'updateReminder': {
        let clients = this._load('clients');
        clients = clients.map(c => {
          if (c.id === body.clientId) {
            c.reminders = (c.reminders || []).map(r =>
              r.id === body.reminderId ? { ...r, ...body.data } : r
            );
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true };
      }
      case 'toggleReminder': {
        let clients = this._load('clients');
        clients = clients.map(c => {
          if (c.id === body.clientId) {
            c.reminders = (c.reminders || []).map(r =>
              r.id === body.reminderId ? { ...r, done: !r.done } : r
            );
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true };
      }
      case 'deleteReminder': {
        let clients = this._load('clients');
        clients = clients.map(c => {
          if (c.id === body.clientId) {
            c.reminders = (c.reminders || []).filter(r => r.id !== body.reminderId);
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true };
      }
      default:
        return { error: 'Unknown action' };
    }
  },
};
