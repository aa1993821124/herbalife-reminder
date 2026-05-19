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
    var normalizeClient = function(c) {
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
    };
    var normalizeAdmin = function(a) {
      return {
        '\u7BA1\u7406\u54E1ID': a['\u7BA1\u7406\u54E1ID'] || '',
        '\u59D3\u540D': a['\u59D3\u540D'] || '',
        '\u89D2\u8272': a['\u89D2\u8272'] || '',
        '\u8CA0\u8CAC\u5E97\u5225': a['\u8CA0\u8CAC\u5E97\u5225'] || '',
        'LINE userId': a['LINE userId'] || '',
        'Email': a['Email'] || '',
        '\u662F\u5426\u555F\u7528': a['\u662F\u5426\u555F\u7528'] || 'Y',
        '\u5099\u8A3B': a['\u5099\u8A3B'] || '',
        id: a['\u7BA1\u7406\u54E1ID'] || '',
        name: a['\u59D3\u540D'] || '',
        role: a['\u89D2\u8272'] || '',
        store: a['\u8CA0\u8CAC\u5E97\u5225'] || '',
        lineUserId: a['LINE userId'] || '',
        email: a['Email'] || '',
        enabled: a['\u662F\u5426\u555F\u7528'] || 'Y',
        notes: a['\u5099\u8A3B'] || '',
      };
    };

    if (!this.isConnected()) return this._localGet(action);
    try {
      const url = CONFIG.API_URL + '?action=' + action;
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (action === 'getClients' && Array.isArray(data)) {
        return data.map(normalizeClient);
      }
      if (action === 'getAdmins' && Array.isArray(data)) {
        return data.map(normalizeAdmin);
      }
      if (action === 'getAll' && data && !data.error) {
        return {
          clients: Array.isArray(data.clients) ? data.clients.map(normalizeClient) : [],
          admins: Array.isArray(data.admins) ? data.admins.map(normalizeAdmin) : [],
        };
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
      case 'getAll':
        return { clients: this._load('clients'), admins: this._load('admins') };
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
      case 'addAdmin': {
        var adminsAdd = this._load('admins');
        var newAdmin = {
          '管理員ID': body.id || 'ADM' + Date.now(), '姓名': body.name || '',
          '角色': body.role || '管理員', '負責店別': body.store || '',
          'LINE userId': body.lineUserId || '', 'Email': body.email || '',
          '是否啟用': body.enabled || 'Y', '備註': body.notes || '',
          id: body.id || 'ADM' + Date.now(), name: body.name || '',
          role: body.role || '管理員', store: body.store || '',
          lineUserId: body.lineUserId || '', email: body.email || '',
          enabled: body.enabled || 'Y', notes: body.notes || '',
        };
        adminsAdd.push(newAdmin);
        this._store('admins', adminsAdd);
        return { success: true };
      }
      case 'updateAdmin': {
        var adminsUpd = this._load('admins');
        var d = body.data || {};
        adminsUpd = adminsUpd.map(function(a) {
          if ((a['管理員ID'] || a.id) !== body.adminId) return a;
          return Object.assign({}, a, {
            '管理員ID': d.id || body.adminId, '姓名': d.name || '',
            '角色': d.role || '', '負責店別': d.store || '',
            'LINE userId': d.lineUserId || '', 'Email': d.email || '',
            '是否啟用': d.enabled || 'Y', '備註': d.notes || '',
            id: d.id || body.adminId, name: d.name || '',
            role: d.role || '', store: d.store || '',
            lineUserId: d.lineUserId || '', email: d.email || '',
            enabled: d.enabled || 'Y', notes: d.notes || '',
          });
        });
        this._store('admins', adminsUpd);
        return { success: true };
      }
      default: return { error: 'Unknown action' };
    }
  },
};
