// ════════════════════════════════════════════════════════════════
// Easyfit CRM — Google Apps Script
// 賀寶芙客戶售後自動提醒系統（LINE OA 推播版）
// ════════════════════════════════════════════════════════════════

// ── 取得試算表 ──
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// ── 取得系統設定 ──
function getSetting(key) {
  const ws = getSheet("系統設定");
  const data = ws.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

// ════════════════════════════════════════════
// 1. 主程式：每日檢查提醒（設定為定時觸發器）
// ════════════════════════════════════════════
function dailyCheckReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const clientSheet = getSheet("客戶資料");
  const ruleSheet = getSheet("跟進規則模板");
  const logSheet = getSheet("提醒紀錄");
  const adminSheet = getSheet("管理員");

  const clients = getSheetData(clientSheet);
  const rules = getSheetData(ruleSheet).filter(r => r["是否啟用"] === "Y");
  const admins = getSheetData(adminSheet).filter(a => a["是否啟用"] === "Y");
  const logs = getSheetData(logSheet);

  const overdueAlertDays = parseInt(getSetting("逾期警報天數")) || 2;

  // ── 對每個客戶 x 每條規則，檢查是否該觸發 ──
  clients.forEach(client => {
    const purchaseDate = new Date(client["購買日期"]);
    if (isNaN(purchaseDate.getTime())) return;

    rules.forEach(rule => {
      // 檢查產品是否適用
      if (rule["適用產品"] !== "全部") {
        const ruleProducts = rule["適用產品"].split(",").map(p => p.trim());
        const clientProducts = (client["購買產品"] || "").split(",").map(p => p.trim());
        const match = ruleProducts.some(rp => clientProducts.some(cp => cp.includes(rp)));
        if (!match) return;
      }

      // 計算觸發日期
      const triggerDate = new Date(purchaseDate);
      triggerDate.setDate(triggerDate.getDate() + parseInt(rule["觸發天數"]));
      triggerDate.setHours(0, 0, 0, 0);

      // 檢查是否已經有這筆紀錄
      const exists = logs.some(
        log => log["客戶ID"] === client["客戶ID"] && log["規則ID"] === rule["規則ID"]
      );
      if (exists) return;

      // 如果觸發日期是今天或已過，建立紀錄
      if (triggerDate <= today) {
        const logId = "L" + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-3);

        // 組合訊息
        const message = rule["提醒訊息模板"]
          .replace(/\{客戶姓名\}/g, client["客戶姓名"])
          .replace(/\{產品\}/g, client["購買產品"]);

        // 找到負責的管理員
        const admin = admins.find(a => a["管理員ID"] === client["負責管理員ID"]);

        // 發送 LINE 通知給管理員
        if (admin && admin["LINE userId"]) {
          const adminMsg = `📋 提醒通知\n\n`
            + `👤 客戶：${client["客戶姓名"]}\n`
            + `📌 類型：${rule["規則名稱"]}\n`
            + `📅 觸發：${formatDate(triggerDate)}\n`
            + `📱 電話：${client["手機號碼"] || "未填"}\n\n`
            + `💬 建議訊息：\n${message}\n\n`
            + `請處理後到提醒紀錄表標記「已處理」`;

          sendLineMessage(admin["LINE userId"], adminMsg);
        }

        // 寫入提醒紀錄
        logSheet.appendRow([
          logId,
          client["客戶ID"],
          client["客戶姓名"],
          rule["規則ID"],
          rule["規則名稱"],
          formatDate(triggerDate),
          formatDateTime(new Date()),
          "已發送",
          client["負責管理員ID"],
          admin ? admin["姓名"] : "",
          "待處理",
          "",
          ""
        ]);
      }
    });
  });

  // ── 檢查逾期未處理 → 通知超級管理員 ──
  checkOverdueAndAlertSuperAdmin(overdueAlertDays, admins);
}

// ════════════════════════════════════════════
// 2. 逾期未處理警報（通知超級管理員）
// ════════════════════════════════════════════
function checkOverdueAndAlertSuperAdmin(overdueAlertDays, admins) {
  const logSheet = getSheet("提醒紀錄");
  const logs = getSheetData(logSheet);
  const now = new Date();

  const superAdmins = admins.filter(a => a["角色"] === "超級管理員");
  if (superAdmins.length === 0) return;

  const overdueItems = logs.filter(log => {
    if (log["管理員處理狀態"] !== "待處理") return false;
    const sentTime = new Date(log["實際發送時間"]);
    if (isNaN(sentTime.getTime())) return false;
    const diffDays = Math.floor((now - sentTime) / (1000 * 60 * 60 * 24));
    return diffDays >= overdueAlertDays;
  });

  if (overdueItems.length === 0) return;

  // 更新狀態為「逾期未處理」
  const allData = logSheet.getDataRange().getValues();
  overdueItems.forEach(item => {
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === item["紀錄ID"] && allData[i][10] === "待處理") {
        logSheet.getRange(i + 1, 11).setValue("逾期未處理");
      }
    }
  });

  // 通知超級管理員
  let alertMsg = `⚠️ 逾期未處理警報\n\n以下 ${overdueItems.length} 筆提醒已超過 ${overdueAlertDays} 天未處理：\n\n`;
  overdueItems.forEach((item, idx) => {
    alertMsg += `${idx + 1}. ${item["客戶姓名"]}（${item["規則名稱"]}）\n`
      + `   負責人：${item["負責管理員姓名"]}\n`
      + `   觸發日：${item["預定觸發日期"]}\n\n`;
  });

  superAdmins.forEach(sa => {
    if (sa["LINE userId"]) {
      sendLineMessage(sa["LINE userId"], alertMsg);
    }
  });
}

// ════════════════════════════════════════════
// 3. 新客戶建檔時自動產生提醒（onEdit 觸發）
// ════════════════════════════════════════════
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "客戶資料") return;
  if (getSetting("自動建立提醒") !== "Y") return;

  const row = e.range.getRow();
  if (row <= 1) return; // 跳過標題列

  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const clientId = data[0];
  const purchaseDate = data[5];

  if (!clientId || !purchaseDate) return;

  // 檢查提醒紀錄是否已有此客戶
  const logSheet = getSheet("提醒紀錄");
  const logs = getSheetData(logSheet);
  if (logs.some(l => l["客戶ID"] === clientId)) return;

  // 讀取啟用中的規則，為此客戶產生所有未來提醒
  const rules = getSheetData(getSheet("跟進規則模板")).filter(r => r["是否啟用"] === "Y");
  const pDate = new Date(purchaseDate);

  rules.forEach(rule => {
    const triggerDate = new Date(pDate);
    triggerDate.setDate(triggerDate.getDate() + parseInt(rule["觸發天數"]));

    const logId = "L" + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-3);

    logSheet.appendRow([
      logId,
      clientId,
      data[1], // 客戶姓名
      rule["規則ID"],
      rule["規則名稱"],
      formatDate(triggerDate),
      "",
      "待發送",
      data[7], // 負責管理員ID
      data[8], // 負責管理員姓名
      "待處理",
      "",
      ""
    ]);
  });
}

// ════════════════════════════════════════════
// 4. LINE Messaging API 推播
// ════════════════════════════════════════════
function sendLineMessage(userId, text) {
  const token = getSetting("LINE Channel Access Token");
  if (!token || token.startsWith("(")) {
    Logger.log("LINE Token 未設定，跳過推播: " + text);
    return;
  }

  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: userId,
    messages: [{ type: "text", text: text }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    Logger.log("LINE 推播結果: " + res.getResponseCode() + " → " + userId);
  } catch (err) {
    Logger.log("LINE 推播失敗: " + err.message);
  }
}

// ════════════════════════════════════════════
// 5. 設定定時觸發器（只需執行一次）
// ════════════════════════════════════════════
function setupTrigger() {
  // 清除舊的觸發器
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // 每天早上 9 點執行 dailyCheckReminders
  ScriptApp.newTrigger("dailyCheckReminders")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  // onEdit 觸發器（自動建立提醒）
  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log("✅ 觸發器設定完成：每日 9:00 檢查 + 編輯時自動建立提醒");
}

// ════════════════════════════════════════════
// 6. 手動測試用
// ════════════════════════════════════════════
function testSendLine() {
  // 填入你自己的 LINE userId 測試
  const testUserId = getSetting("LINE Channel Access Token") ? "YOUR_USER_ID" : "";
  sendLineMessage(testUserId, "🧪 Easyfit CRM 測試訊息\n\n如果你收到這條，代表 LINE 推播設定成功！");
}

function manualCheckNow() {
  Logger.log("⏰ 手動執行每日檢查...");
  dailyCheckReminders();
  Logger.log("✅ 檢查完成");
}

// ════════════════════════════════════════════
// 工具函式
// ════════════════════════════════════════════
function getSheetData(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).filter(row => row[0] !== "" && !String(row[0]).startsWith("💡")).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function formatDate(d) {
  const date = new Date(d);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function formatDateTime(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
}

// ════════════════════════════════════════════
// 7. Web API（給前端 App 用，選用）
// ════════════════════════════════════════════
function doGet(e) {
  const action = e.parameter.action;
  let result = {};

  try {
    switch (action) {
      case "getClients":
        result = getSheetData(getSheet("客戶資料"));
        break;
      case "getAdmins":
        result = getSheetData(getSheet("管理員"));
        break;
      case "getRules":
        result = getSheetData(getSheet("跟進規則模板"));
        break;
      case "getReminders":
        result = getSheetData(getSheet("提醒紀錄"));
        break;
      case "getDashboard":
        const logs = getSheetData(getSheet("提醒紀錄"));
        result = {
          total: getSheetData(getSheet("客戶資料")).length,
          pending: logs.filter(l => l["管理員處理狀態"] === "待處理").length,
          overdue: logs.filter(l => l["管理員處理狀態"] === "逾期未處理").length,
          completed: logs.filter(l => l["管理員處理狀態"] === "已處理").length
        };
        break;
      default:
        result = { error: "Unknown action" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  let result = {};

  try {
    switch (action) {
      case "addClient":
        const cs = getSheet("客戶資料");
        const cId = "C" + Date.now().toString().slice(-6);
        cs.appendRow([
          cId, body.name, body.phone, body.email, body.lineId,
          body.purchaseDate, body.products, body.adminId, body.adminName,
          body.store, body.source, body.notes, formatDate(new Date())
        ]);
        result = { success: true, clientId: cId };
        break;

      case "markDone":
        const ls = getSheet("提醒紀錄");
        const allData = ls.getDataRange().getValues();
        for (let i = 1; i < allData.length; i++) {
          if (allData[i][0] === body.logId) {
            ls.getRange(i + 1, 11).setValue("已處理");
            ls.getRange(i + 1, 12).setValue(formatDateTime(new Date()));
            ls.getRange(i + 1, 13).setValue(body.notes || "");
            break;
          }
        }
        result = { success: true };
        break;

      default:
        result = { error: "Unknown action" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
