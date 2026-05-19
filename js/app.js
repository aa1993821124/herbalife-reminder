// ═══════════════════════════════════════
// Easyfit CRM — Main App
// 純 JS，無框架依賴
// ═══════════════════════════════════════

const App = {
  el: null,
  state: {
    clients: [],
    admins: [],
    view: 'home',
    selectedClient: null,
    editingReminder: null,
    editingAdmin: null,
    search: '',
    loading: true,
  },

  // ── Init ──
  async init() {
    this.el = document.getElementById('app');
    this.render();
    const all = await API.get('getAll');
    this.state.clients = Array.isArray(all.clients) ? all.clients : [];
    this.state.admins = Array.isArray(all.admins) ? all.admins : [];
    this.state.loading = false;
    this.render();
  },

  setState(patch) {
    Object.assign(this.state, patch);
    this.render();
  },

  getClient(id) {
    return this.state.clients.find(c => c.id === id);
  },

  getAdminName(adminId) {
    if (!adminId) return '未指派';
    const a = this.state.admins.find(a => (a['\u7BA1\u7406\u54E1ID'] || a.id) === adminId);
    if (a) return a['\u59D3\u540D'] || a.name || '未知';
    return adminId;
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
    if (loading) { this.el.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><p style="color:#94A3B8;margin-top:16px">載入中...</p></div>'; return; }

    switch (view) {
      case 'home': this.renderHome(); break;
      case 'add': case 'edit_client': this.renderClientForm(); break;
      case 'detail': this.renderDetail(); break;
      case 'edit_reminder': this.renderReminderForm(); break;
      case 'reminders': this.renderAllReminders(); break;
      case 'admin_list': this.renderAdminList(); break;
      case 'add_admin': case 'edit_admin': this.renderAdminForm(); break;
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

    const filtered = clients.filter(c => {
      if (!c || !c.name) return false;
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) ||
        (c.phone && c.phone.includes(search)) ||
        (c.email && c.email.toLowerCase().includes(s));
    });

    let html = '';

    // Header
    html += '<div class="header"><div class="header-inner">';
    html += '<div><h1 class="brand">Easyfit CRM</h1><p class="subtitle">賀寶芙客戶售後提醒系統</p></div>';
    html += '<div class="header-actions">';
    html += '<button class="icon-btn" onclick="App.setState({view:\'admin_list\'})" title="管理員">👥</button>';
    html += '<button class="icon-btn ' + (overdue.length > 0 ? 'has-alert' : '') + '" onclick="App.setState({view:\'reminders\'})">';
    html += '⏰' + (overdue.length > 0 ? '<span class="badge">' + overdue.length + '</span>' : '');
    html += '</button>';
    html += '</div></div></div>';

    // Setup banner
    if (!API.isConnected()) {
      html += '<div class="setup-banner"><p>⚡ 離線模式：資料儲存在瀏覽器。<br>設定 Google Sheet 後端請到 <code>js/config.js</code> 填入 Apps Script URL。</p></div>';
    }

    // Stats
    html += '<div class="stats-bar">';
    html += '<div class="stat-card"><p class="stat-value" style="color:var(--amber)">' + clients.length + '</p><p class="stat-label">總客戶</p></div>';
    html += '<div class="stat-card"><p class="stat-value" style="color:var(--blue)">' + upcoming.length + '</p><p class="stat-label">待跟進</p></div>';
    html += '<div class="stat-card"><p class="stat-value" style="color:var(--red)">' + overdue.length + '</p><p class="stat-label">已逾期</p></div>';
    html += '</div>';

    // Search
    html += '<div class="search-wrap"><input class="search-input" placeholder="🔍 搜尋客戶姓名、電話、Email..." value="' + escHtml(search) + '" oninput="App.state.search=this.value;App.render()"></div>';

    // Upcoming strip
    if (upcoming.length > 0) {
      html += '<div class="upcoming-strip"><p class="upcoming-label">⏳ 近期提醒</p><div class="upcoming-scroll">';
      upcoming.slice(0, 6).forEach(r => {
        const t = getTypeInfo(r.type);
        html += '<div class="upcoming-card" style="border-left:3px solid ' + t.color + '" onclick="App.goClient(\'' + r.clientId + '\')">';
        html += '<span style="font-size:18px">' + t.icon + '</span>';
        html += '<div style="flex:1;min-width:0"><p class="upcoming-name">' + escHtml(r.clientName) + '</p><p class="upcoming-time">' + formatDate(r.datetime) + '</p></div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // Client list
    html += '<div class="list-section"><div class="list-header"><h2 class="list-title">客戶名單</h2><span class="list-count">' + filtered.length + ' 位</span></div>';
    if (filtered.length === 0) {
      html += '<div class="empty"><p class="empty-icon">📋</p><p>' + (clients.length === 0 ? '尚無客戶，點右下角 ＋ 新增' : '找不到符合的客戶') + '</p></div>';
    } else {
      html += '<div class="client-list">';
      filtered.forEach(c => {
        const cr = (c.reminders || []).filter(r => !r.done && new Date(r.datetime) >= new Date());
        const co = (c.reminders || []).filter(r => !r.done && new Date(r.datetime) < new Date());
        const adminLabel = this.getAdminName(c.adminId);
        html += '<div class="client-card" onclick="App.goClient(\'' + c.id + '\')">';
        html += '<div class="avatar">' + escHtml(c.name[0]) + '</div>';
        html += '<div style="flex:1;min-width:0"><p class="client-name">' + escHtml(c.name) + '</p>';
        html += '<p class="client-sub">' + escHtml(c.phone || c.email || '未填聯絡方式') + ' · ' + escHtml(adminLabel) + '</p></div>';
        html += '<div class="client-meta">';
        if (co.length > 0) html += '<span class="tag-badge tag-overdue">逾期' + co.length + '</span>';
        if (cr.length > 0) html += '<span class="tag-badge tag-pending">⏰' + cr.length + '</span>';
        html += '<span class="chevron">›</span></div></div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // FAB
    html += '<button class="fab" onclick="App.setState({view:\'add\'})">＋</button>';

    this.el.innerHTML = html;
  },

  // ════════════════════════════════════════
  // CLIENT FORM (add / edit)
  // ════════════════════════════════════════
  renderClientForm() {
    const isEdit = this.state.view === 'edit_client';
    const c = isEdit ? this.state.selectedClient : {};

    let html = '<div class="form-header">';
    html += '<button class="back-btn" onclick="App.setState({view: ' + (isEdit ? "'detail'" : "'home'") + '})">← 返回</button>';
    html += '<h2 class="form-title">' + (isEdit ? '編輯客戶' : '新增客戶') + '</h2>';
    html += '<div style="width:60px"></div></div>';

    const products = (c.products || '').split(',').map(p => p.trim()).filter(Boolean);

    // Build admin dropdown options
    const admins = this.state.admins.filter(a => (a['\u662F\u5426\u555F\u7528'] || a.enabled) === 'Y');
    let adminOptions = '<option value="">請選擇負責管理員</option>';
    admins.forEach(a => {
      const aId = a['\u7BA1\u7406\u54E1ID'] || a.id || '';
      const aName = a['\u59D3\u540D'] || a.name || '';
      const aStore = a['\u8CA0\u8CAC\u5E97\u5225'] || a.store || '';
      const selected = (c.adminId === aId) ? ' selected' : '';
      adminOptions += '<option value="' + aId + '"' + selected + '>' + escHtml(aName) + (aStore ? ' (' + escHtml(aStore) + ')' : '') + '</option>';
    });

    html += '<div class="form-body" id="clientForm">';
    html += this._field('客戶姓名 *', 'cf_name', c.name || '', '請輸入姓名');
    html += this._field('手機號碼', 'cf_phone', c.phone || '', '0912-345-678', 'tel');
    html += this._field('Email', 'cf_email', c.email || '', 'email@example.com', 'email');
    html += this._field('LINE ID / 名稱', 'cf_lineId', c.lineId || '', 'LINE ID');
    html += this._field('購買日期', 'cf_purchaseDate', c.purchaseDate || formatDateOnly(new Date()), '', 'date');

    // Admin dropdown
    html += '<div class="field-wrap"><label class="field-label">負責管理員</label>';
    html += '<select class="input" id="cf_adminId">' + adminOptions + '</select></div>';

    // Products
    html += '<div class="field-wrap"><label class="field-label">購買產品</label><div class="product-grid">';
    CONFIG.PRODUCTS.forEach(p => {
      const isActive = products.includes(p);
      html += '<button class="product-tag ' + (isActive ? 'active' : '') + '" onclick="App.toggleProduct(this,\'' + escHtml(p) + '\')">' + (isActive ? '✓ ' : '') + escHtml(p) + '</button>';
    });
    html += '</div></div>';

    // Notes
    html += '<div class="field-wrap"><label class="field-label">備註</label>';
    html += '<textarea class="textarea" id="cf_notes" rows="3" placeholder="客戶目標、健康狀況、注意事項...">' + escHtml(c.notes || '') + '</textarea></div>';

    html += '<button class="primary-btn" onclick="App.saveClient(' + isEdit + ')">' + (isEdit ? '儲存變更' : '建立客戶') + '</button>';
    html += '</div>';

    this.el.innerHTML = html;
  },

  _field(label, id, value, placeholder, type) {
    type = type || 'text';
    return '<div class="field-wrap"><label class="field-label">' + label + '</label><input class="input" id="' + id + '" type="' + type + '" value="' + escHtml(value) + '" placeholder="' + placeholder + '"></div>';
  },

  toggleProduct(btn, product) {
    btn.classList.toggle('active');
    btn.textContent = btn.classList.contains('active') ? '✓ ' + product : product;
  },

  async saveClient(isEdit) {
    const name = document.getElementById('cf_name').value.trim();
    if (!name) { showToast('請輸入客戶姓名'); return; }

    const adminId = document.getElementById('cf_adminId').value;
    const adminObj = this.state.admins.find(a => (a['管理員ID'] || a.id) === adminId);
    const adminName = adminObj ? (adminObj['姓名'] || adminObj.name || '') : '';
    const store = adminObj ? (adminObj['負責店別'] || adminObj.store || '') : '';
    const products = Array.from(document.querySelectorAll('.product-tag.active')).map(b => b.textContent.replace('✓ ', '')).join(', ');
    const data = {
      name: name,
      phone: document.getElementById('cf_phone').value.trim(),
      email: document.getElementById('cf_email').value.trim(),
      lineId: document.getElementById('cf_lineId').value.trim(),
      purchaseDate: document.getElementById('cf_purchaseDate').value,
      store: store,
      adminId: adminId,
      adminName: adminName,
      products: products,
      notes: document.getElementById('cf_notes').value.trim(),
    };

    if (isEdit) {
      await API.post({ action: 'updateClient', clientId: this.state.selectedClient.id, data: data });
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
    const adminLabel = this.getAdminName(c.adminId);

    let html = '<div class="form-header">';
    html += '<button class="back-btn" onclick="App.setState({view:\'home\',selectedClient:null})">← 返回</button>';
    html += '<h2 class="form-title">客戶詳情</h2>';
    html += '<button class="edit-btn" onclick="App.setState({view:\'edit_client\'})">✏️</button>';
    html += '</div>';

    // Info card
    html += '<div class="detail-card">';
    html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">';
    html += '<div class="avatar lg">' + escHtml(c.name[0]) + '</div>';
    html += '<div><h3 style="font-size:20px">' + escHtml(c.name) + '</h3>';
    if (c.purchaseDate) html += '<p style="font-size:13px;color:var(--text-muted)">首購 ' + c.purchaseDate + '</p>';
    html += '</div></div>';

    html += '<div class="info-grid">';
    if (c.phone) html += '<div class="info-row"><span class="icon">📱</span><span class="label">電話</span><a class="value" href="tel:' + c.phone + '">' + escHtml(c.phone) + '</a></div>';
    if (c.email) html += '<div class="info-row"><span class="icon">✉️</span><span class="label">Email</span><a class="value" href="mailto:' + c.email + '">' + escHtml(c.email) + '</a></div>';
    if (c.lineId) html += '<div class="info-row"><span class="icon">💬</span><span class="label">LINE</span><span class="value">' + escHtml(c.lineId) + '</span></div>';
    if (c.store) html += '<div class="info-row"><span class="icon">🏠</span><span class="label">店別</span><span class="value">' + escHtml(c.store) + '</span></div>';
    // ★ 顯示負責管理員
    html += '<div class="info-row"><span class="icon">👤</span><span class="label">負責人</span><span class="value">' + escHtml(adminLabel) + '</span></div>';
    html += '</div>';

    if (c.products) {
      html += '<div style="margin-top:12px"><p style="font-size:12px;color:var(--text-muted);margin-bottom:6px">購買產品</p><div style="display:flex;flex-wrap:wrap;gap:4px">';
      c.products.split(',').forEach(p => { html += '<span class="prod-badge">' + escHtml(p.trim()) + '</span>'; });
      html += '</div></div>';
    }
    if (c.notes) html += '<div class="notes-box">📝 ' + escHtml(c.notes) + '</div>';
    html += '</div>';

    // Reminders
    html += '<div class="reminder-section">';
    html += '<div class="reminder-header"><h3 class="reminder-title">⏰ 提醒事項</h3>';
    html += '<button class="add-reminder-btn" onclick="App.setState({editingReminder:null,view:\'edit_reminder\'})">+ 新增提醒</button></div>';

    if (active.length === 0 && done.length === 0) {
      html += '<p style="color:var(--text-muted);text-align:center;padding:20px;font-size:14px">尚無提醒，點右上方新增</p>';
    }

    active.forEach(r => { html += this._reminderCard(r, c.id); });
    if (done.length > 0) {
      html += '<p class="done-label">已完成 (' + done.length + ')</p>';
      done.forEach(r => { html += this._reminderCard(r, c.id); });
    }
    html += '</div>';

    // Actions
    html += '<div class="section-pad"><div class="action-grid">';
    if (c.phone) html += '<button class="action-btn call" onclick="window.open(\'tel:' + c.phone + '\')">📞<span>撥號</span></button>';
    else html += '<div></div>';
    html += '<button class="action-btn line" onclick="App.openLine(\'' + escHtml(c.name) + '\')">💬<span>LINE</span></button>';
    html += '<button class="action-btn email" onclick="App.openEmail(\'' + escHtml(c.name) + '\',\'' + (c.email || '') + '\')">✉️<span>Email</span></button>';
    html += '<button class="action-btn calendar" onclick="App.addToCalendar(\'' + escHtml(c.name) + '\',\'' + (c.phone || '') + '\')">📅<span>行事曆</span></button>';
    html += '</div>';
    html += '<button class="danger-btn" onclick="App.confirmDelete(\'' + c.id + '\',\'' + escHtml(c.name) + '\')">🗑️ 刪除此客戶</button>';
    html += '</div>';

    this.el.innerHTML = html;
  },

  _reminderCard(r, clientId) {
    const t = getTypeInfo(r.type);
    const isOverdue = !r.done && new Date(r.datetime) < new Date();
    let html = '<div class="reminder-card ' + (r.done ? 'done' : '') + '" style="border-left:3px solid ' + (isOverdue ? 'var(--red)' : t.color) + '">';
    html += '<div class="reminder-top">';
    html += '<button class="check-btn" onclick="App.toggleReminder(\'' + clientId + '\',\'' + r.id + '\')">' + (r.done ? '✅' : '⬜') + '</button>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div class="reminder-type"><span class="icon">' + t.icon + '</span><span class="name">' + t.label + '</span>' + (isOverdue ? '<span class="overdue-tag">逾期</span>' : '') + '</div>';
    html += '<p class="reminder-time">' + formatDate(r.datetime) + '</p>';
    if (r.note) html += '<p class="reminder-note">' + escHtml(r.note) + '</p>';
    if (r.action) html += '<p class="reminder-action" style="color:' + t.color + '">🔔 ' + escHtml(r.action) + '</p>';
    html += '</div>';
    html += '<div class="mini-btns"><button class="mini-btn" onclick="App.editReminder(\'' + r.id + '\')">✏️</button>';
    html += '<button class="mini-btn" onclick="App.deleteReminder(\'' + clientId + '\',\'' + r.id + '\')">🗑</button></div>';
    html += '</div></div>';
    return html;
  },

  // ════════════════════════════════════════
  // REMINDER FORM
  // ════════════════════════════════════════
  renderReminderForm() {
    const r = this.state.editingReminder;
    const c = this.state.selectedClient;
    const type = r ? r.type : 'follow_up';
    const action = r ? (r.action || '') : '';
    const defaultDT = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16);

    let html = '<div class="form-header">';
    html += '<button class="back-btn" onclick="App.setState({view:\'detail\'})">← 返回</button>';
    html += '<h2 class="form-title">' + (r ? '編輯提醒' : '新增提醒') + '</h2>';
    html += '<div style="width:60px"></div></div>';

    html += '<div class="form-body">';
    if (c) html += '<p style="color:var(--text-sub);font-size:14px;margin-bottom:16px">客戶：<strong>' + escHtml(c.name) + '</strong></p>';

    // Type grid
    html += '<div class="field-wrap"><label class="field-label">提醒類型</label><div class="type-grid">';
    CONFIG.REMINDER_TYPES.forEach(t => {
      const active = t.id === type;
      const style = active ? 'background:' + t.color + '18;border-color:' + t.color + ';color:' + t.color : '';
      html += '<button class="type-btn ' + (active ? 'active' : '') + '" style="' + style + '" onclick="document.getElementById(\'rf_type\').value=\'' + t.id + '\';App.renderReminderForm()">';
      html += '<span class="icon">' + t.icon + '</span><span class="name">' + t.label + '</span></button>';
    });
    html += '</div><input type="hidden" id="rf_type" value="' + type + '"></div>';

    html += this._field('提醒時間 *', 'rf_datetime', r ? r.datetime : defaultDT, '', 'datetime-local');

    // Action options
    html += '<div class="field-wrap"><label class="field-label">觸發動作</label><div class="action-options">';
    CONFIG.ACTIONS.forEach(a => {
      html += '<button class="action-option ' + (action === a.id ? 'active' : '') + '" onclick="document.getElementById(\'rf_action\').value=\'' + a.id + '\';document.querySelectorAll(\'.action-option\').forEach(b=>b.classList.remove(\'active\'));this.classList.add(\'active\')">' + a.label + '</button>';
    });
    html += '</div><input type="hidden" id="rf_action" value="' + escHtml(action) + '"></div>';

    html += '<div class="field-wrap"><label class="field-label">備註</label>';
    html += '<textarea class="textarea" id="rf_note" rows="2" placeholder="提醒內容、注意事項...">' + escHtml(r ? (r.note || '') : '') + '</textarea></div>';

    html += '<button class="primary-btn" onclick="App.saveReminder(' + (r ? 'true' : 'false') + ')">' + (r ? '儲存變更' : '建立提醒') + '</button>';
    html += '</div>';
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
      await API.post({ action: 'updateReminder', clientId: clientId, reminderId: this.state.editingReminder.id, data: data });
      const c = this.getClient(clientId);
      c.reminders = (c.reminders || []).map(r => r.id === this.state.editingReminder.id ? Object.assign({}, r, data) : r);
      showToast('提醒已更新 ✅');
    } else {
      const res = await API.post({ action: 'addReminder', clientId: clientId, type: data.type, datetime: data.datetime, note: data.note, action_type: data.action });
      const newR = { id: res.reminderId || 'R' + Date.now(), done: false, createdAt: new Date().toISOString(), type: data.type, datetime: data.datetime, note: data.note, action: data.action };
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

    let html = '<div class="form-header">';
    html += '<button class="back-btn" onclick="App.setState({view:\'home\'})">← 返回</button>';
    html += '<h2 class="form-title">所有提醒</h2><div style="width:60px"></div></div>';
    html += '<div class="all-reminders">';

    if (overdue.length > 0) {
      html += '<h3 class="overdue">🔴 已逾期 (' + overdue.length + ')</h3>';
      overdue.forEach(r => {
        const t = getTypeInfo(r.type);
        html += '<div class="reminder-card clickable" style="border-left:3px solid var(--red)" onclick="App.goClient(\'' + r.clientId + '\')">';
        html += '<div class="reminder-summary"><span>' + t.icon + '</span><div style="flex:1"><p class="name">' + escHtml(r.clientName) + '</p><p class="time overdue">' + formatDate(r.datetime) + '</p></div><span class="chevron">›</span></div></div>';
      });
    }

    if (upcoming.length > 0) {
      html += '<h3 class="upcoming">🔵 即將到期 (' + upcoming.length + ')</h3>';
      upcoming.forEach(r => {
        const t = getTypeInfo(r.type);
        html += '<div class="reminder-card clickable" style="border-left:3px solid ' + t.color + '" onclick="App.goClient(\'' + r.clientId + '\')">';
        html += '<div class="reminder-summary"><span>' + t.icon + '</span><div style="flex:1"><p class="name">' + escHtml(r.clientName) + '</p><p class="time normal">' + formatDate(r.datetime) + '</p></div><span class="chevron">›</span></div></div>';
      });
    }

    if (upcoming.length === 0 && overdue.length === 0) {
      html += '<div class="empty"><p class="empty-icon">🎉</p><p>目前沒有待辦提醒</p></div>';
    }
    html += '</div>';
    this.el.innerHTML = html;
  },

  // ════════════════════════════════════════
  // ADMIN LIST ★ 新功能
  // ════════════════════════════════════════
  renderAdminList() {
    const admins = this.state.admins;

    let html = '<div class="form-header">';
    html += '<button class="back-btn" onclick="App.setState({view:\'home\'})">← 返回</button>';
    html += '<h2 class="form-title">管理員</h2>';
    html += '<button class="edit-btn" onclick="App.setState({editingAdmin:null,view:\'add_admin\'})">＋</button>';
    html += '</div>';

    html += '<div style="padding:12px 20px">';

    if (admins.length === 0) {
      html += '<div class="empty"><p class="empty-icon">👥</p><p>尚無管理員</p></div>';
    } else {
      admins.forEach(a => {
        const id = a['\u7BA1\u7406\u54E1ID'] || a.id || '';
        const name = a['\u59D3\u540D'] || a.name || '未命名';
        const role = a['\u89D2\u8272'] || a.role || '';
        const store = a['\u8CA0\u8CAC\u5E97\u5225'] || a.store || '';
        const enabled = a['\u662F\u5426\u555F\u7528'] || a.enabled || 'Y';
        const hasUserId = (a['LINE userId'] || a.lineUserId || '').startsWith('U');

        html += '<div class="client-card" onclick="App.editAdminById(\'' + id + '\')">';
        html += '<div class="avatar" style="background:' + (role === '超級管理員' ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' : 'linear-gradient(135deg,#3B82F6,#2563EB)') + '">' + escHtml(name[0]) + '</div>';
        html += '<div style="flex:1;min-width:0">';
        html += '<p class="client-name">' + escHtml(name) + '</p>';
        html += '<p class="client-sub">' + escHtml(role) + (store ? ' · ' + escHtml(store) : '') + '</p>';
        html += '</div>';
        html += '<div class="client-meta">';
        if (enabled === 'N') html += '<span class="tag-badge tag-overdue">停用</span>';
        if (hasUserId) html += '<span class="tag-badge" style="background:var(--green-light);color:#059669">LINE ✓</span>';
        else html += '<span class="tag-badge" style="background:var(--red-light);color:#DC2626">未綁LINE</span>';
        html += '<span class="chevron">›</span></div></div>';
      });
    }

    // Summary
    const clientCounts = {};
    this.state.clients.forEach(c => {
      const aid = c.adminId || '未指派';
      clientCounts[aid] = (clientCounts[aid] || 0) + 1;
    });

    html += '<div style="margin-top:20px"><p style="font-size:13px;font-weight:600;color:var(--text-sub);margin-bottom:8px">📊 客戶分配</p>';
    admins.forEach(a => {
      const id = a['\u7BA1\u7406\u54E1ID'] || a.id || '';
      const name = a['\u59D3\u540D'] || a.name || '';
      const count = clientCounts[id] || 0;
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light)">';
      html += '<span style="font-size:14px">' + escHtml(name) + '</span>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--amber)">' + count + ' 位客戶</span></div>';
    });
    if (clientCounts['未指派']) {
      html += '<div style="display:flex;justify-content:space-between;padding:6px 0">';
      html += '<span style="font-size:14px;color:var(--text-muted)">未指派</span>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--red)">' + clientCounts['未指派'] + ' 位客戶</span></div>';
    }
    html += '</div></div>';

    this.el.innerHTML = html;
  },

  editAdminById(id) {
    const a = this.state.admins.find(a => (a['\u7BA1\u7406\u54E1ID'] || a.id) === id);
    if (a) {
      this.setState({ editingAdmin: a, view: 'edit_admin' });
    }
  },

  // ════════════════════════════════════════
  // ADMIN FORM ★ 新功能
  // ════════════════════════════════════════
  renderAdminForm() {
    const isEdit = this.state.view === 'edit_admin';
    const a = isEdit ? this.state.editingAdmin : {};
    const id = a['\u7BA1\u7406\u54E1ID'] || a.id || '';
    const name = a['\u59D3\u540D'] || a.name || '';
    const role = a['\u89D2\u8272'] || a.role || '管理員';
    const store = a['\u8CA0\u8CAC\u5E97\u5225'] || a.store || '';
    const lineUserId = a['LINE userId'] || a.lineUserId || '';
    const email = a['Email'] || a.email || '';
    const enabled = (a['\u662F\u5426\u555F\u7528'] || a.enabled || 'Y');
    const notes = a['\u5099\u8A3B'] || a.notes || '';

    let html = '<div class="form-header">';
    html += '<button class="back-btn" onclick="App.setState({view:\'admin_list\',editingAdmin:null})">← 返回</button>';
    html += '<h2 class="form-title">' + (isEdit ? '編輯管理員' : '新增管理員') + '</h2>';
    html += '<div style="width:60px"></div></div>';

    html += '<div class="form-body">';
    if (isEdit) html += this._field('管理員ID', 'af_id', id, '', 'text');
    html += this._field('姓名 *', 'af_name', name, '請輸入姓名');

    // Role selector
    html += '<div class="field-wrap"><label class="field-label">角色</label>';
    html += '<select class="input" id="af_role">';
    html += '<option value="管理員"' + (role === '管理員' ? ' selected' : '') + '>管理員（只收自己客戶的通知）</option>';
    html += '<option value="超級管理員"' + (role === '超級管理員' ? ' selected' : '') + '>超級管理員（收到所有通知 + 逾期警報）</option>';
    html += '</select></div>';

    html += this._field('負責店別', 'af_store', store, '例：新莊店、全部');
    html += this._field('LINE userId *', 'af_lineUserId', lineUserId, 'U 開頭的 33 位字串');
    html += '<div class="hint-box" style="margin-top:-10px;margin-bottom:16px">💡 到 LINE Developers Console → Basic settings → Your user ID 取得</div>';
    html += this._field('Email', 'af_email', email, 'email@example.com', 'email');

    // Enabled toggle
    html += '<div class="field-wrap"><label class="field-label">狀態</label>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="action-option ' + (enabled === 'Y' ? 'active' : '') + '" onclick="document.getElementById(\'af_enabled\').value=\'Y\';document.querySelectorAll(\'.status-opt\').forEach(b=>b.classList.remove(\'active\'));this.classList.add(\'active\')" class="status-opt">✅ 啟用</button>';
    html += '<button class="action-option ' + (enabled === 'N' ? 'active' : '') + '" onclick="document.getElementById(\'af_enabled\').value=\'N\';document.querySelectorAll(\'.status-opt\').forEach(b=>b.classList.remove(\'active\'));this.classList.add(\'active\')" class="status-opt">❌ 停用</button>';
    html += '</div><input type="hidden" id="af_enabled" value="' + enabled + '"></div>';

    html += '<div class="field-wrap"><label class="field-label">備註</label>';
    html += '<textarea class="textarea" id="af_notes" rows="2" placeholder="備註...">' + escHtml(notes) + '</textarea></div>';

    html += '<button class="primary-btn" onclick="App.saveAdmin(' + isEdit + ')">' + (isEdit ? '儲存變更' : '新增管理員') + '</button>';
    html += '</div>';

    this.el.innerHTML = html;
  },

  async saveAdmin(isEdit) {
    const name = document.getElementById('af_name').value.trim();
    if (!name) { showToast('請輸入姓名'); return; }
    const lineUserId = document.getElementById('af_lineUserId').value.trim();

    const data = {
      id: isEdit ? document.getElementById('af_id').value : 'ADM' + Date.now().toString().slice(-4),
      name: name,
      role: document.getElementById('af_role').value,
      store: document.getElementById('af_store').value.trim(),
      lineUserId: lineUserId,
      email: document.getElementById('af_email').value.trim(),
      enabled: document.getElementById('af_enabled').value,
      notes: document.getElementById('af_notes').value.trim(),
    };

    // Normalize to Sheet column names for local storage
    const normalized = {
      '\u7BA1\u7406\u54E1ID': data.id,
      '\u59D3\u540D': data.name,
      '\u89D2\u8272': data.role,
      '\u8CA0\u8CAC\u5E97\u5225': data.store,
      'LINE userId': data.lineUserId,
      'Email': data.email,
      '\u662F\u5426\u555F\u7528': data.enabled,
      '\u5099\u8A3B': data.notes,
      id: data.id, name: data.name, role: data.role, store: data.store,
      lineUserId: data.lineUserId, email: data.email, enabled: data.enabled, notes: data.notes,
    };

    if (isEdit) {
      this.state.admins = this.state.admins.map(a => {
        if ((a['\u7BA1\u7406\u54E1ID'] || a.id) === data.id) return normalized;
        return a;
      });
      await API.post({ action: 'updateAdmin', adminId: data.id, data: data });
      showToast('管理員已更新 ✅');
    } else {
      this.state.admins.push(normalized);
      await API.post({ action: 'addAdmin', ...data });
      showToast('管理員已新增 🎉');
    }
    this.setState({ view: 'admin_list', editingAdmin: null });
  },

  // ════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════
  goClient(id) {
    this.setState({ selectedClient: this.getClient(id), view: 'detail' });
  },

  async toggleReminder(clientId, reminderId) {
    await API.post({ action: 'toggleReminder', clientId: clientId, reminderId: reminderId });
    const c = this.getClient(clientId);
    c.reminders = (c.reminders || []).map(r => r.id === reminderId ? Object.assign({}, r, { done: !r.done }) : r);
    this.state.selectedClient = c;
    this.render();
  },

  editReminder(reminderId) {
    const c = this.state.selectedClient;
    const r = (c.reminders || []).find(r => r.id === reminderId);
    this.setState({ editingReminder: r, view: 'edit_reminder' });
  },

  async deleteReminder(clientId, reminderId) {
    await API.post({ action: 'deleteReminder', clientId: clientId, reminderId: reminderId });
    const c = this.getClient(clientId);
    c.reminders = (c.reminders || []).filter(r => r.id !== reminderId);
    this.state.selectedClient = c;
    showToast('提醒已刪除');
    this.render();
  },

  confirmDelete(clientId, name) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = '<div class="modal"><p class="modal-title">確認刪除</p><p class="modal-text">確定要刪除「' + name + '」的所有資料嗎？此操作無法復原。</p><div class="modal-actions"><button class="modal-cancel" onclick="this.closest(\'.overlay\').remove()">取消</button><button class="modal-confirm-delete" onclick="App.deleteClient(\'' + clientId + '\')">確認刪除</button></div></div>';
    document.body.appendChild(overlay);
  },

  async deleteClient(clientId) {
    var el = document.querySelector('.overlay');
    if (el) el.remove();
    await API.post({ action: 'deleteClient', clientId: clientId });
    this.state.clients = this.state.clients.filter(c => c.id !== clientId);
    showToast('客戶已刪除');
    this.setState({ view: 'home', selectedClient: null });
  },

  openLine(name) {
    var msg = encodeURIComponent(name + ' 您好！我是 Easyfit 的教練，想關心一下您最近的健康狀況和產品使用情形，有什麼可以幫忙的嗎？😊');
    window.open('https://line.me/R/oaMessage/' + CONFIG.LINE_OA_ID + '/?' + msg);
  },

  openEmail(name, email) {
    var subject = encodeURIComponent(name + ' 您好 — Easyfit 關心您的健康');
    var body = encodeURIComponent('親愛的 ' + name + ' 您好，\n\n感謝您選擇 Easyfit 與賀寶芙的產品。\n想關心一下您最近的使用狀況，是否有任何疑問或需要協助的地方呢？\n\n期待您的回覆！\nEasyfit 運動俱樂部');
    window.open('mailto:' + email + '?subject=' + subject + '&body=' + body);
  },

  addToCalendar(name, phone) {
    var ics = generateICS(null, '跟進客戶 ' + name, '賀寶芙客戶售後跟進\n電話: ' + (phone || 'N/A'));
    downloadICS('follow-up-' + name + '.ics', ics);
    showToast('行事曆檔案已下載 📅');
  },
};

// ── Start ──
document.addEventListener('DOMContentLoaded', function() { App.init(); });
