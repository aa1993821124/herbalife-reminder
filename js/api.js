// ═══════════════════════════════════════
// Easyfit CRM — API Layer
// 串接 Google Apps Script Web App
// 如果未設定 API_URL 則用 localStorage 離線模式
// ═══════════════════════════════════════

const API = {
  isConnected() {
    return CONFIG.API_URL && CONFIG.API_URL.length > 10;
  },

  async get(action) {
    if (!this.isConnected()) return this._localGet(action);
    try {
      const url = CONFIG.API_URL + '?action=' + action;
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (action === 'getClients' && Array.isArray(data)) {
        return data.map(function(c) {
          return {
            id: c['\u5BA2\u6236ID'] || c.id || 'C' + Date.now(),
            name: c['\u5BA2\u6236\u59D3\u540D'] || c.name || '\u672A\u547D\u540D',
            phone: c['\u624B\u6A5F\u865F\u78BC'] || c.phone || '',
            email: c['Email'] || c.email || '',
            lineId: c['LINE\u540D\u7A31'] || c.lineId || '',
            products: c['\u8CFC\u8CB7\u7522\u54C1'] || c.products || '',
            purchaseDate: c['\u8CFC\u8CB7\u65E5\u671F'] || c.purchaseDate || '',
            store: c['\u5E97\u5225'] || c.store || '',
            source: c['\u5BA2\u6236\u4F86\u6E90'] || c.source || '',
            notes: c['\u5099\u8A3B'] || c.notes || '',
            adminId: c['\u8CA0\u8CAC\u7BA1\u7406\u54E1ID'] || c.adminId || '',
            adminName: c['\u8CA0\u8CAC\u7BA1\u7406\u54E1\u59D3\u540D'] || c.adminName || '',
            reminders: c.reminders || [],
            createdAt: c['\u5EFA\u6A94\u65E5\u671F'] || c.createdAt || '',
          };
        });
      }
      return data;
    } catch (err) {
      console.error('API GET failed, fallback to local:', err);
      return this._localGet(action);
    }
  },

  async post(body) {
    if (!this.isConnected()) return this._localPost(body);
    try {
      const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.error('API POST failed, fallback to local:', err);
      return this._localPost(body);
    }
  },

  _store(key, val) { localStorage.setItem('easyfit_' + key, JSON.stringify(val)); },
  _load(key) { try { return JSON.parse(localStorage.getItem('easyfit_' + key)) || []; } catch(e) { return []; } },

  _localGet(action) {
    switch (action) {
      case 'getClients': return this._load('clients');
      case 'getAdmins': return this._load('admins');
      case 'getRules': return this._load('rules');
      case 'getReminders': return this._load('reminders');
      case 'getDashboard': {
        var clients = this._load('clients');
        var allR = clients.flatMap(function(c) { return c.reminders || []; });
        return {
          total: clients.length,
          pending: allR.filter(function(r) { return !r.done && new Date(r.datetime) >= new Date(); }).length,
          overdue: allR.filter(function(r) { return !r.done && new Date(r.datetime) < new Date(); }).length,
          completed: allR.filter(function(r) { return r.done; }).length,
        };
      }
      default: return [];
    }
  },

  _localPost(body) {
    switch (body.action) {
      case 'addClient': {
        var clients = this._load('clients');
        var newClient = {
          id: 'C' + Date.now(), name: body.name, phone: body.phone || '',
          email: body.email || '', lineId: body.lineId || '', products: body.products || '',
          purchaseDate: body.purchaseDate || '', adminId: body.adminId || '',
          adminName: body.adminName || '', store: body.store || '', source: body.source || '',
          notes: body.notes || '', createdAt: new Date().toISOString(), reminders: [],
        };
        clients.unshift(newClient);
        this._store('clients', clients);
        return { success: true, clientId: newClient.id };
      }
      case 'updateClient': {
        var clients = this._load('clients');
        clients = clients.map(function(c) { return c.id === body.clientId ? Object.assign({}, c, body.data) : c; });
        this._store('clients', clients);
        return { success: true };
      }
      case 'deleteClient': {
        var clients = this._load('clients');
        clients = clients.filter(function(c) { return c.id !== body.clientId; });
        this._store('clients', clients);
        return { success: true };
      }
      case 'addReminder': {
        var clients = this._load('clients');
        var reminder = {
          id: 'R' + Date.now() + Math.random().toString(36).slice(-4),
          type: body.type, datetime: body.datetime, note: body.note || '',
          action: body.action_type || '', done: false, createdAt: new Date().toISOString(),
        };
        clients = clients.map(function(c) {
          if (c.id === body.clientId) { c.reminders = c.reminders || []; c.reminders.push(reminder); }
          return c;
        });
        this._store('clients', clients);
        return { success: true, reminderId: reminder.id };
      }
      case 'updateReminder': {
        var clients = this._load('clients');
        clients = clients.map(function(c) {
          if (c.id === body.clientId) {
            c.reminders = (c.reminders || []).map(function(r) {
              return r.id === body.reminderId ? Object.assign({}, r, body.data) : r;
            });
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true };
      }
      case 'toggleReminder': {
        var clients = this._load('clients');
        clients = clients.map(function(c) {
          if (c.id === body.clientId) {
            c.reminders = (c.reminders || []).map(function(r) {
              return r.id === body.reminderId ? Object.assign({}, r, { done: !r.done }) : r;
            });
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true };
      }
      case 'deleteReminder': {
        var clients = this._load('clients');
        clients = clients.map(function(c) {
          if (c.id === body.clientId) {
            c.reminders = (c.reminders || []).filter(function(r) { return r.id !== body.reminderId; });
          }
          return c;
        });
        this._store('clients', clients);
        return { success: true };
      }
      default: return { error: 'Unknown action' };
    }
  },
};
