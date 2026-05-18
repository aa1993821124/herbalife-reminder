// ═══════════════════════════════════════
// Easyfit CRM — Main App
// 純 JS，無框架依賴
// ═══════════════════════════════════════

const App = {
  el: null,
  state: {
    clients: [],
    view: 'home',        // home | add | edit_client | detail | edit_reminder | reminders
    selectedClient: null,
    editingReminder: null,
    search: '',
    loading: true,
  },

  // ── Init ──
  async init() {
    this.el = document.getElementById('app');
    this.render();
    const clients = await API.get('getClients');
    this.state.clients = Array.isArray(clients) ? clients : [];
    this.state.loading = false;
    this.render();
  },

  // ── State helpers ──
  setState(patch) {
    Object.assign(this.state, patch);
    this.render();
  },

  getClient(id) {
    return this.state.clients.find(c => c.id === id);
  },

  getAllReminders() {
    return this.state.clients.flatMap(c =>
      (c.reminders || []).map(r => ({ ...r, clientName: c.name, clientId: c.id }))
    );
  },

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════
  render() {
    const { view, loading } = this.state;
    if (loading) { this.el.innerHTML = `<div class="loading-wrap"><div class="spinner"></div><p style="color:#94A3B8;margin-top:16px">載入中...</p></div>`; return; }

    switch (view) {
      case 'home': this.renderHome(); break;
      case 'add': case 'edit_client': this.renderClientForm(); break;
      case 'detail': this.renderDetail(); break;
      case 'edit_reminder': this.renderReminderForm(); break;
      case 'reminders': this.renderAllReminders(); break;
    }
  },

  // ════════════════════════════════════════
  // HOME
  // ════════════════════════════════════════
  renderHome() {
    const { clients, search } = this.state;
    const all = this.getAllReminders();
    const upcoming = all.filter(r => !r.done && new Date(r.datetime) >= new Date()).sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    const overdue = all.filter(r => !r.done && new Date(r.datetime) < new Date());

    const filtered = clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );

    let html = '';

    // Header
    html += `<div class="header"><div class="header-inner">
      <div><h1 class="brand">Easyfit CRM</h1><p class="subtitle">賀寶芙客戶售後提醒系統</p></div>
      <div class="header-actions">
        <button class="icon-btn ${overdue.length > 0 ? 'has-alert' : ''}" onclick="App.setState({view:'reminders'})">
          ⏰${overdue.length > 0 ? `<span class="badge">${overdue.length}</span>` : ''}
        </button>
      </div>
    </div></div>`;

    // Setup banner (if no API connected)
    if (!API.isConnected()) {
      html += `<div class="setup-banner">
        <p>⚡ 離線模式：資料儲存在瀏覽器。<br>設定 Google Sheet 後端請到 <code>js/config.js</code> 填入 Apps Script URL。</p>
      </div>`;
    }

    // Stats
    html += `<div class="stats-bar">
      <div class="stat-card"><p class="stat-value" style="color:var(--amber)">${clients.length}</p><p class="stat-label">總客戶</p></div>
      <div class="stat-card"><p class="stat-value" style="color:var(--blue)">${upcoming.length}</p><p class="stat-label">待跟進</p></div>
      <div class="stat-card"><p class="stat-value" style="color:var(--red)">${overdue.length}</p><p class="stat-label">已逾期</p></div>
    </div>`;

    // Search
    html += `<div class="search-wrap"><input class="search-input" placeholder="🔍 搜尋客戶姓名、電話、Email..." value="${escHtml(search)}" oninput="App.state.search=this.value;App.render()"></div>`;

    // Upcoming strip
    if (upcoming.length > 0) {
      html += `<div class="upcoming-strip"><p class="upcoming-label">⏳ 近期提醒</p><div class="upcoming-scroll">`;
      upcoming.slice(0, 6).forEach(r => {
        const t = getTypeInfo(r.type);
        html += `<div class="upcoming-card" style="border-left:3px solid ${t.color}" onclick="App.goClient('${r.clientId}')">
          <span style="font-size:18px">${t.icon}</span>
          <div style="flex:1;min-width:0"><p class="upcoming-name">${escHtml(r.clientName)}</p><p class="upcoming-time">${formatDate(r.datetime)}</p></div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // Client list
    html += `<div class="list-section"><div class="list-header"><h2 class="list-title">客戶名單</h2><span class="list-count">${filtered.length} 位</span></div>`;
    if (filtered.length === 0) {
      html += `<div class="empty"><p class="empty-icon">📋</p><p>${clients.length === 0 ? '尚無客戶，點右下角 ＋ 新增' : '找不到符合的客戶'}</p></div>`;
    } else {
      html += `<div class="client-list">`;
      filtered.forEach(c => {
        const cr = (c.reminders || []).filter(r => !r.done && new Date(r.datetime) >= new Date());
        const co = (c.reminders || []).filter(r => !r.done && new Date(r.datetime) < new Date());
        html += `<div class="client-card" onclick="App.goClient('${c.id}')">
          <div class="avatar">${escHtml(c.name[0])}</div>
          <div style="flex:1;min-width:0"><p class="client-name">${escHtml(c.name)}</p><p class="client-sub">${escHtml(c.phone || c.email || '未填聯絡方式')}</p></div>
          <div class="client-meta">
            ${co.length > 0 ? `<span class="tag-badge tag-overdue">逾期${co.length}</span>` : ''}
            ${cr.length > 0 ? `<span class="tag-badge tag-pending">⏰${cr.length}</span>` : ''}
            <span class="chevron">›</span>
          </div>
        </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;

    // FAB
    html += `<button class="fab" onclick="App.setState({view:'add'})">＋</button>`;

    this.el.innerHTML = html;
  },

  // ════════════════════════════════════════
  // CLIENT FORM (add / edit)
  // ════════════════════════════════════════
  renderClientForm() {
    const isEdit = this.state.view === 'edit_client';
    const c = isEdit ? this.state.selectedClient : {};

    let html = `<div class="form-header">
      <button class="back-btn" onclick="App.setState({view: ${isEdit ? "'detail'" : "'home'"}})">← 返回</button>
      <h2 class="form-title">${isEdit ? '編輯客戶' : '新增客戶'}</h2>
      <div style="width:60px"></div>
    </div>`;

    const products = (c.products || '').split(',').map(p => p.trim()).filter(Boolean);

    html += `<div class="form-body" id="clientForm">
      ${this._field('客戶姓名 *', 'cf_name', c.name || '', '請輸入姓名')}
      ${this._field('手機號碼', 'cf_phone', c.phone || '', '0912-345-678', 'tel')}
      ${this._field('Email', 'cf_email', c.email || '', 'email@example.com', 'email')}
      ${this._field('LINE ID / 名稱', 'cf_lineId', c.lineId || '', 'LINE ID')}
      ${this._field('購買日期', 'cf_purchaseDate', c.purchaseDate || formatDateOnly(new Date()), '', 'date')}
      ${this._field('店別', 'cf_store', c.store || '', '例：新莊店')}
      ${this._field('客戶來源', 'cf_source', c.source || '', '例：朋友介紹、門市體驗')}

      <div class="field-wrap">
        <label class="field-label">購買產品</label>
        <div class="product-grid">
          ${CONFIG.PRODUCTS.map(p => `<button class="product-tag ${products.includes(p) ? 'active' : ''}" onclick="App.toggleProduct(this,'${escHtml(p)}')">${products.includes(p) ? '✓ ' : ''}${escHtml(p)}</button>`).join('')}
        </div>
      </div>

      <div class="field-wrap">
        <label class="field-label">備註</label>
        <textarea class="textarea" id="cf_notes" rows="3" placeholder="客戶目標、健康狀況、注意事項...">${escHtml(c.notes || '')}</textarea>
      </div>

      <button class="primary-btn" onclick="App.saveClient(${isEdit})">${isEdit ? '儲存變更' : '建立客戶'}</button>
    </div>`;

    this.el.innerHTML = html;
  },

  _field(label, id, value, placeholder, type = 'text') {
    return `<div class="field-wrap"><label class="field-label">${label}</label><input class="input" id="${id}" type="${type}" value="${escHtml(value)}" placeholder="${placeholder}"></div>`;
  },

  _selectedProducts: new Set(),

  toggleProduct(btn, product) {
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) {
      btn.textContent = '✓ ' + product;
    } else {
      btn.textContent = product;
    }
  },

  async saveClient(isEdit) {
    const name = document.getElementById('cf_name').value.trim();
    if (!name) { showToast('請輸入客戶姓名'); return; }

    const products = Array.from(document.querySelectorAll('.product-tag.active')).map(b => b.textContent.replace('✓ ', '')).join(', ');
    const data = {
      name,
      phone: document.getElementById('cf_phone').value.trim(),
      email: document.getElementById('cf_email').value.trim(),
      lineId: document.getElementById('cf_lineId').value.trim(),
      purchaseDate: document.getElementById('cf_purchaseDate').value,
      store: document.getElementById('cf_store').value.trim(),
      source: document.getElementById('cf_source').value.trim(),
      products,
      notes: document.getElementById('cf_notes').value.trim(),
    };

    if (isEdit) {
      await API.post({ action: 'updateClient', clientId: this.state.selectedClient.id, data });
      Object.assign(this.state.selectedClient, data);
      const idx = this.state.clients.findIndex(c => c.id === this.state.selectedClient.id);
      if (idx >= 0) Object.assign(this.state.clients[idx], data);
      showToast('客戶資料已更新 ✅');
      this.setState({ view: 'detail' });
    } else {
      const res = await API.post({ action: 'addClient', ...data });
      const newClient = { id: res.clientId || 'C' + Date.now(), reminders: [], createdAt: new Date().toISOString(), ...data };
      this.state.clients.unshift(newClient);
      showToast('新客戶已建立 🎉');
      this.setState({ view: 'home' });
    }
  },

  // ════════════════════════════════════════
  // CLIENT DETAIL
  // ════════════════════════════════════════
  renderDetail() {
    const c = this.state.selectedClient;
    if (!c) { this.setState({ view: 'home' }); return; }

    const reminders = (c.reminders || []).sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    const active = reminders.filter(r => !r.done);
    const done = reminders.filter(r => r.done);

    let html = `<div class="form-header">
      <button class="back-btn" onclick="App.setState({view:'home',selectedClient:null})">← 返回</button>
      <h2 class="form-title">客戶詳情</h2>
      <button class="edit-btn" onclick="App.setState({view:'edit_client'})">✏️</button>
    </div>`;

    // Info card
    html += `<div class="detail-card">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div class="avatar lg">${escHtml(c.name[0])}</div>
        <div><h3 style="font-size:20px">${escHtml(c.name)}</h3>
        ${c.purchaseDate ? `<p style="font-size:13px;color:var(--text-muted)">首購 ${c.purchaseDate}</p>` : ''}</div>
      </div>
      <div class="info-grid">
        ${c.phone ? `<div class="info-row"><span class="icon">📱</span><span class="label">電話</span><a class="value" href="tel:${c.phone}">${escHtml(c.phone)}</a></div>` : ''}
        ${c.email ? `<div class="info-row"><span class="icon">✉️</span><span class="label">Email</span><a class="value" href="mailto:${c.email}">${escHtml(c.email)}</a></div>` : ''}
        ${c.lineId ? `<div class="info-row"><span class="icon">💬</span><span class="label">LINE</span><span class="value">${escHtml(c.lineId)}</span></div>` : ''}
        ${c.store ? `<div class="info-row"><span class="icon">🏠</span><span class="label">店別</span><span class="value">${escHtml(c.store)}</span></div>` : ''}
      </div>
      ${c.products ? `<div style="margin-top:12px"><p style="font-size:12px;color:var(--text-muted);margin-bottom:6px">購買產品</p><div style="display:flex;flex-wrap:wrap;gap:4px">${c.products.split(',').map(p => `<span class="prod-badge">${escHtml(p.trim())}</span>`).join('')}</div></div>` : ''}
      ${c.notes ? `<div class="notes-box">📝 ${escHtml(c.notes)}</div>` : ''}
    </div>`;

    // Reminders
    html += `<div class="reminder-section">
      <div class="reminder-header"><h3 class="reminder-title">⏰ 提醒事項</h3>
      <button class="add-reminder-btn" onclick="App.setState({editingReminder:null,view:'edit_reminder'})">+ 新增提醒</button></div>`;

    if (active.length === 0 && done.length === 0) {
      html += `<p style="color:var(--text-muted);text-align:center;padding:20px;font-size:14px">尚無提醒，點右上方新增</p>`;
    }

    active.forEach(r => { html += this._reminderCard(r, c.id); });
    if (done.length > 0) {
      html += `<p class="done-label">已完成 (${done.length})</p>`;
      done.forEach(r => { html += this._reminderCard(r, c.id); });
    }
    html += `</div>`;

    // Actions
    html += `<div class="section-pad">
      <div class="action-grid">
        ${c.phone ? `<button class="action-btn call" onclick="window.open('tel:${c.phone}')">📞<span>撥號</span></button>` : '<div></div>'}
        <button class="action-btn line" onclick="App.openLine('${escHtml(c.name)}')">💬<span>LINE</span></button>
        <button class="action-btn email" onclick="App.openEmail('${escHtml(c.name)}','${c.email || ''}')">✉️<span>Email</span></button>
        <button class="action-btn calendar" onclick="App.addToCalendar('${escHtml(c.name)}','${c.phone || ''}')">📅<span>行事曆</span></button>
      </div>
      <button class="danger-btn" onclick="App.confirmDelete('${c.id}','${escHtml(c.name)}')">🗑️ 刪除此客戶</button>
    </div>`;

    this.el.innerHTML = html;
  },

  _reminderCard(r, clientId) {
    const t = getTypeInfo(r.type);
    const isOverdue = !r.done && new Date(r.datetime) < new Date();
    return `<div class="reminder-card ${r.done ? 'done' : ''}" style="border-left:3px solid ${isOverdue ? 'var(--red)' : t.color}">
      <div class="reminder-top">
        <button class="check-btn" onclick="App.toggleReminder('${clientId}','${r.id}')">${r.done ? '✅' : '⬜'}</button>
        <div style="flex:1;min-width:0">
          <div class="reminder-type"><span class="icon">${t.icon}</span><span class="name">${t.label}</span>${isOverdue ? '<span class="overdue-tag">逾期</span>' : ''}</div>
          <p class="reminder-time">${formatDate(r.datetime)}</p>
          ${r.note ? `<p class="reminder-note">${escHtml(r.note)}</p>` : ''}
          ${r.action ? `<p class="reminder-action" style="color:${t.color}">🔔 ${escHtml(r.action)}</p>` : ''}
        </div>
        <div class="mini-btns">
          <button class="mini-btn" onclick="App.editReminder('${r.id}')">✏️</button>
          <button class="mini-btn" onclick="App.deleteReminder('${clientId}','${r.id}')">🗑</button>
        </div>
      </div>
    </div>`;
  },

  // ════════════════════════════════════════
  // REMINDER FORM
  // ════════════════════════════════════════
  renderReminderForm() {
    const r = this.state.editingReminder;
    const c = this.state.selectedClient;
    const type = r?.type || 'follow_up';
    const action = r?.action || '';
    const defaultDT = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16);

    let html = `<div class="form-header">
      <button class="back-btn" onclick="App.setState({view:'detail'})">← 返回</button>
      <h2 class="form-title">${r ? '編輯提醒' : '新增提醒'}</h2>
      <div style="width:60px"></div>
    </div>`;

    html += `<div class="form-body">`;
    if (c) html += `<p style="color:var(--text-sub);font-size:14px;margin-bottom:16px">客戶：<strong>${escHtml(c.name)}</strong></p>`;

    // Type grid
    html += `<div class="field-wrap"><label class="field-label">提醒類型</label><div class="type-grid">`;
    CONFIG.REMINDER_TYPES.forEach(t => {
      const active = t.id === type;
      html += `<button class="type-btn ${active ? 'active' : ''}" style="${active ? `background:${t.color}18;border-color:${t.color};color:${t.color}` : ''}" onclick="document.getElementById('rf_type').value='${t.id}';App.renderReminderForm()">
        <span class="icon">${t.icon}</span><span class="name">${t.label}</span>
      </button>`;
    });
    html += `</div><input type="hidden" id="rf_type" value="${type}"></div>`;

    html += this._field('提醒時間 *', 'rf_datetime', r?.datetime || defaultDT, '', 'datetime-local');

    // Action options
    html += `<div class="field-wrap"><label class="field-label">觸發動作</label><div class="action-options">`;
    CONFIG.ACTIONS.forEach(a => {
      html += `<button class="action-option ${action === a.id ? 'active' : ''}" onclick="document.getElementById('rf_action').value='${a.id}';document.querySelectorAll('.action-option').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${a.label}</button>`;
    });
    html += `</div><input type="hidden" id="rf_action" value="${escHtml(action)}"></div>`;

    html += `<div class="field-wrap"><label class="field-label">備註</label>
      <textarea class="textarea" id="rf_note" rows="2" placeholder="提醒內容、注意事項...">${escHtml(r?.note || '')}</textarea></div>`;

    html += `<button class="primary-btn" onclick="App.saveReminder(${r ? 'true' : 'false'})">${r ? '儲存變更' : '建立提醒'}</button>`;

    html += `</div>`;
    this.el.innerHTML = html;
  },

  async saveReminder(isEdit) {
    const clientId = this.state.selectedClient.id;
    const data = {
      type: document.getElementById('rf_type').value,
      datetime: document.getElementById('rf_datetime').value,
      note: document.getElementById('rf_note').value.trim(),
      action: document.getElementById('rf_action').value,
    };

    if (isEdit) {
      await API.post({ action: 'updateReminder', clientId, reminderId: this.state.editingReminder.id, data });
      const c = this.getClient(clientId);
      c.reminders = (c.reminders || []).map(r => r.id === this.state.editingReminder.id ? { ...r, ...data } : r);
      showToast('提醒已更新 ✅');
    } else {
      const res = await API.post({ action: 'addReminder', clientId, ...data, action_type: data.action });
      const newR = { id: res.reminderId || 'R' + Date.now(), done: false, createdAt: new Date().toISOString(), ...data };
      const c = this.getClient(clientId);
      c.reminders = c.reminders || [];
      c.reminders.push(newR);
      showToast('提醒已建立 ⏰');
    }
    this.state.selectedClient = this.getClient(clientId);
    this.setState({ view: 'detail' });
  },

  // ════════════════════════════════════════
  // ALL REMINDERS
  // ════════════════════════════════════════
  renderAllReminders() {
    const all = this.getAllReminders();
    const upcoming = all.filter(r => !r.done && new Date(r.datetime) >= new Date()).sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
    const overdue = all.filter(r => !r.done && new Date(r.datetime) < new Date()).sort((a,b) => new Date(b.datetime) - new Date(a.datetime));

    let html = `<div class="form-header">
      <button class="back-btn" onclick="App.setState({view:'home'})">← 返回</button>
      <h2 class="form-title">所有提醒</h2>
      <div style="width:60px"></div>
    </div><div class="all-reminders">`;

    if (overdue.length > 0) {
      html += `<h3 class="overdue">🔴 已逾期 (${overdue.length})</h3>`;
      overdue.forEach(r => {
        const t = getTypeInfo(r.type);
        html += `<div class="reminder-card clickable" style="border-left:3px solid var(--red)" onclick="App.goClient('${r.clientId}')">
          <div class="reminder-summary"><span>${t.icon}</span><div style="flex:1"><p class="name">${escHtml(r.clientName)}</p><p class="time overdue">${formatDate(r.datetime)}</p></div><span class="chevron">›</span></div>
        </div>`;
      });
    }

    if (upcoming.length > 0) {
      html += `<h3 class="upcoming">🔵 即將到期 (${upcoming.length})</h3>`;
      upcoming.forEach(r => {
        const t = getTypeInfo(r.type);
        html += `<div class="reminder-card clickable" style="border-left:3px solid ${t.color}" onclick="App.goClient('${r.clientId}')">
          <div class="reminder-summary"><span>${t.icon}</span><div style="flex:1"><p class="name">${escHtml(r.clientName)}</p><p class="time normal">${formatDate(r.datetime)}</p></div><span class="chevron">›</span></div>
        </div>`;
      });
    }

    if (upcoming.length === 0 && overdue.length === 0) {
      html += `<div class="empty"><p class="empty-icon">🎉</p><p>目前沒有待辦提醒</p></div>`;
    }

    html += `</div>`;
    this.el.innerHTML = html;
  },

  // ════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════
  goClient(id) {
    this.setState({ selectedClient: this.getClient(id), view: 'detail' });
  },

  async toggleReminder(clientId, reminderId) {
    await API.post({ action: 'toggleReminder', clientId, reminderId });
    const c = this.getClient(clientId);
    c.reminders = (c.reminders || []).map(r => r.id === reminderId ? { ...r, done: !r.done } : r);
    this.state.selectedClient = c;
    this.render();
  },

  editReminder(reminderId) {
    const c = this.state.selectedClient;
    const r = (c.reminders || []).find(r => r.id === reminderId);
    this.setState({ editingReminder: r, view: 'edit_reminder' });
  },

  async deleteReminder(clientId, reminderId) {
    await API.post({ action: 'deleteReminder', clientId, reminderId });
    const c = this.getClient(clientId);
    c.reminders = (c.reminders || []).filter(r => r.id !== reminderId);
    this.state.selectedClient = c;
    showToast('提醒已刪除');
    this.render();
  },

  confirmDelete(clientId, name) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `<div class="modal">
      <p class="modal-title">確認刪除</p>
      <p class="modal-text">確定要刪除「${name}」的所有資料嗎？此操作無法復原。</p>
      <div class="modal-actions">
        <button class="modal-cancel" onclick="this.closest('.overlay').remove()">取消</button>
        <button class="modal-confirm-delete" onclick="App.deleteClient('${clientId}')">確認刪除</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
  },

  async deleteClient(clientId) {
    document.querySelector('.overlay')?.remove();
    await API.post({ action: 'deleteClient', clientId });
    this.state.clients = this.state.clients.filter(c => c.id !== clientId);
    showToast('客戶已刪除');
    this.setState({ view: 'home', selectedClient: null });
  },

  openLine(name) {
    const msg = encodeURIComponent(`${name} 您好！我是 Easyfit 的教練，想關心一下您最近的健康狀況和產品使用情形，有什麼可以幫忙的嗎？😊`);
    window.open(`https://line.me/R/oaMessage/${CONFIG.LINE_OA_ID}/?${msg}`);
  },

  openEmail(name, email) {
    const subject = encodeURIComponent(`${name} 您好 — Easyfit 關心您的健康`);
    const body = encodeURIComponent(`親愛的 ${name} 您好，\n\n感謝您選擇 Easyfit 與賀寶芙的產品。\n想關心一下您最近的使用狀況，是否有任何疑問或需要協助的地方呢？\n\n期待您的回覆！\nEasyfit 運動俱樂部`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  },

  addToCalendar(name, phone) {
    const ics = generateICS(
      null,
      `跟進客戶 ${name}`,
      `賀寶芙客戶售後跟進\n電話: ${phone || 'N/A'}`
    );
    downloadICS(`follow-up-${name}.ics`, ics);
    showToast('行事曆檔案已下載 📅');
  },
};

// ── Start ──
document.addEventListener('DOMContentLoaded', () => App.init());
