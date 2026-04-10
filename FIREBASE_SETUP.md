# 🔥 Firebase 競賽模式設定指南

## 總共需要 5 分鐘 — 完全免費

---

## 步驟一：建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「**新增專案**」（Add project）
3. 輸入專案名稱（例如：`history-battle` 或您的學校名稱）
4. 關閉 Google Analytics（可選），點擊「**建立專案**」
5. 等待約 30 秒，專案建立完成後點「**繼續**」

---

## 步驟二：建立 Realtime Database

1. 在 Firebase 專案主頁，左側選單找 **「建構」→「Realtime Database」**
2. 點擊「**建立資料庫**」（Create Database）
3. 選擇伺服器位置：建議選 **亞洲東南區（asia-southeast1）** 或就近地區
4. 安全性規則選 **「以測試模式開始」**（Start in test mode）→ 啟用

> ⚠️ 測試模式會在 30 天後過期。建議在過期之前將規則改為下方的自訂規則。

---

## 步驟三：設定安全性規則（重要）

在 Realtime Database 頁面，點擊「**規則**」（Rules）分頁，貼上以下內容：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        "players": {
          "$nickname": {
            ".validate": "newData.hasChildren(['score', 'level'])"
          }
        }
      }
    }
  }
}
```

點擊「**發布**」（Publish）來儲存規則。

> 💡 這些規則允許任何人讀寫 `rooms` 節點，但資料只包含臨時的競賽代號和分數，不涉及個資，適合課堂使用。

---

## 步驟四：取得 Firebase 設定碼

1. 點擊 Firebase 專案主頁右上角的齒輪圖示 → **「專案設定」**
2. 往下滾動到「**您的應用程式**」區段
3. 點擊「**</> Web**」（新增網頁應用程式）
4. 輸入應用程式暱稱（例如：`history-game`），**不要**勾選 Firebase Hosting
5. 點擊「**註冊應用程式**」
6. 找到如下格式的設定碼：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 步驟五：貼入 battle.js

開啟 `battle.js`，找到頂端的 `FIREBASE_CONFIG`（大約第 17 行），
將上方取得的設定值一一填入：

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // ← 替換
  authDomain:        "your-project.firebaseapp.com",   // ← 替換
  databaseURL:       "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app", // ← 替換
  projectId:         "your-project",       // ← 替換
  storageBucket:     "your-project.appspot.com",       // ← 替換
  messagingSenderId: "123456789",          // ← 替換
  appId:             "1:123456789:web:abc123"           // ← 替換
};
```

儲存檔案後即可使用競賽模式！

---

## 使用說明

### 老師端
1. 開啟遊戲頁面，點擊「🏟️ 競賽模式」
2. 點擊「👨‍🏫 我是老師」→「建立競賽房間」
3. 系統生成 6 碼代碼（如：`AB3K7P`）
4. 將代碼投影或傳送給學生
5. 等待學生加入 → 點擊「🚀 開始競賽！」
6. 即時排行榜自動更新
7. 競賽結束後點「🏁 結束競賽」

### 學生端
1. 開啟**同一個遊戲網址**
2. 點擊「🏟️ 競賽模式」→「🎓 我是學生」
3. 輸入老師的 6 碼代碼 + 自選代號（如：鋼鐵俠、NO.1、歷史達人...）
4. 等待老師按下開始後，遊戲自動啟動
5. 遊戲右下角會顯示即時排行榜面板

---

## 免費方案限制

Firebase Spark（免費）方案對於一般課堂使用綽綽有餘：
- 同時連線：100 個裝置
- 資料儲存：1 GB
- 每月流量：10 GB

> 競賽資料為臨時性的（只有代號和分數），不會快速累積。
> 若有需要，可以在 Firebase Console 手動清除 `rooms` 節點的舊資料。

---

## 常見問題

**Q: 學生在不同設備可以加入嗎？**  
A: 可以！學生只要開啟同一個遊戲網址，輸入代碼即可加入。

**Q: 學生能作弊嗎？**  
A: 代號是自選的，分數由伺服器端的 Firebase 統計。遊戲本身無防作弊機制，但這是課堂學習用途，重點在參與過程而非競爭本身。

**Q: 一個房間最多幾人？**  
A: 理論上不限，Firebase 免費版支援 100 個同時連線。

**Q: 房間代碼會重複嗎？**  
A: 代碼由 32 個字元隨機組合的 6 位碼，共 33 億種組合，實際課堂中重複的機率極低。

**Q: 學生分數會被儲存嗎？**  
A: 不會。競賽模式完全不寫入學生的本地存檔（localStorage），也不會影響正常模式的記錄。
Firebase 中的臨時資料在房間關閉後仍在，但您隨時可以手動清除。
