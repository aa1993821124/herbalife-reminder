# 💪 Easyfit CRM — 賀寶芙客戶售後提醒系統

> Herbalife 直銷商的客戶售後追蹤與自動提醒工具

## 功能

- 📋 客戶資料管理（姓名、電話、Email、LINE、購買產品）
- ⏰ 自訂跟進規則（購買後第幾天、提醒什麼、怎麼通知）
- 🔔 LINE OA 自動推播提醒給負責的管理員
- 👥 多管理員支援（不同教練管不同客戶）
- ⚠️ 逾期未處理自動通知超級管理員
- 📅 一鍵加入行事曆 / 撥號 / LINE / Email

## 架構

```
前端（GitHub Pages）     ← 你現在看到的
  ↕ API
Google Apps Script       ← 後端邏輯 + 定時觸發
  ↕
Google Sheet             ← 資料庫
  ↕
LINE Messaging API       ← 推播通知
```

## 快速開始

### 1. 部署前端

```bash
# Fork 或 clone 這個 repo
git clone https://github.com/YOUR_USERNAME/herbalife-reminder.git

# 開啟 GitHub Pages
# Settings → Pages → Source: main branch → / (root)
# 你的網址：https://YOUR_USERNAME.github.io/herbalife-reminder/
```

### 2. 設定 Google Sheet

1. 下載 `docs/easyfit-crm-db.xlsx`
2. 上傳到 Google Drive → 用 Google Sheets 開啟
3. 檔案 → 另存為 Google 試算表
4. 填入管理員資料和 LINE userId

### 3. 安裝 Apps Script

1. Google Sheet → 擴充功能 → Apps Script
2. 貼上 `apps-script/code.js` 的內容
3. 執行 `setupTrigger`（第一次需授權）
4. 部署 → 新增部署 → 網路應用程式 → 部署
5. 複製 Web App URL

### 4. 連接前端與後端

編輯 `js/config.js`：

```js
API_URL: 'https://script.google.com/macros/s/你的部署ID/exec',
```

### 5. 設定 LINE Messaging API

1. [LINE Developers Console](https://developers.line.biz/) → 你的 Channel
2. Messaging API → 發行 Channel Access Token
3. 貼到 Google Sheet「系統設定」

## 檔案結構

```
herbalife-reminder/
├── index.html              ← 主頁面
├── css/style.css           ← 樣式
├── js/
│   ├── config.js           ← ⚙️ 設定檔（改這裡）
│   ├── api.js              ← API 層（自動切換線上/離線）
│   ├── utils.js            ← 工具函式
│   └── app.js              ← 主程式邏輯
├── apps-script/
│   └── code.js             ← Google Apps Script 程式碼
├── docs/
│   └── easyfit-crm-db.xlsx ← Google Sheet 模板
└── README.md
```

## 離線模式

如果還沒設定 Apps Script，App 會自動使用 localStorage 離線運作。所有功能都能用，只是：
- 資料存在瀏覽器（換裝置會消失）
- 不會有 LINE 推播通知

設定好 API_URL 後就會自動切換到線上模式。

## 授權

MIT License
