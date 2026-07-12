// ╔══════════════════════════════════════════════════════╗
// ║   健身紀錄 App — Google Apps Script                  ║
// ║   貼到 Google 試算表的指令碼編輯器後部署即可         ║
// ╚══════════════════════════════════════════════════════╝

var RAW_SHEET   = "原始資料";   // 存放 JSON（App 讀寫用）
var LOG_SHEET   = "訓練明細";   // 人類可讀的逐行紀錄

// ── GET：App 讀取資料 ──────────────────────────────────────
function doGet(e) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(RAW_SHEET);

  if (!sheet || !sheet.getRange("A1").getValue()) {
    return ok('{"log":{},"customEx":{},"unit":"kg","weeklyGoal":4,"version":2}');
  }

  var val = sheet.getRange("A1").getValue();
  return ok(val);
}

// ── POST：App 儲存資料 ─────────────────────────────────────
function doPost(e) {
  try {
    var body = e.postData.contents;
    var data = JSON.parse(body);

    // 1. 把完整 JSON 存到「原始資料」A1（App 同步用）
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var raw = ss.getSheetByName(RAW_SHEET) || ss.insertSheet(RAW_SHEET);
    raw.getRange("A1").setValue(body);
    raw.getRange("A1").setWrap(false);

    // 2. 把訓練紀錄寫成可讀的逐行格式到「訓練明細」
    writeReadableLog(ss, data.log || {});

    return ok('{"success":true}');
  } catch (err) {
    return ok(JSON.stringify({ error: err.toString() }));
  }
}

// ── 寫入可讀訓練明細 ──────────────────────────────────────
function writeReadableLog(ss, log) {
  var sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_SHEET);
    // 建立標題列
    var headers = ["日期","星期","部位","動作","組次","重量","單位","次數","有氧坡度%","有氧速度kph","有氧時間(分)","訓練時長(分)","記錄時間"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#1a1a2e").setFontColor("#ffffff").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  // 清除舊資料（保留標題）
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);

  var weekdays = ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
  var rows = [];

  // 依日期排序
  var dates = Object.keys(log).sort();
  dates.forEach(function(dateStr) {
    var sessions = log[dateStr] || [];
    var d = new Date(dateStr + "T00:00:00");
    var weekday = weekdays[d.getDay()];

    sessions.forEach(function(session) {
      if (session.isCardio) {
        rows.push([
          dateStr, weekday,
          session.type, session.exercise,
          "有氧", "", "", "",
          session.cardio ? session.cardio.incline : "",
          session.cardio ? session.cardio.speed   : "",
          session.cardio ? session.cardio.duration: "",
          session.duration || "",
          session.savedAt ? session.savedAt.slice(0,16).replace("T"," ") : ""
        ]);
      } else {
        var sets = session.sets || [];
        sets.forEach(function(set, idx) {
          rows.push([
            dateStr, weekday,
            session.type, session.exercise,
            "第" + (idx + 1) + "組",
            set.weight || "",
            set.unit || session.unit || "kg",
            set.reps || "",
            "", "", "",
            idx === 0 ? (session.duration || "") : "",
            idx === 0 ? (session.savedAt ? session.savedAt.slice(0,16).replace("T"," ") : "") : ""
          ]);
        });
      }
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    // 自動調整欄寬
    sheet.autoResizeColumns(1, rows[0].length);
  }
}

// ── 回應輔助 ──────────────────────────────────────────────
function ok(content) {
  return ContentService
    .createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON);
}
