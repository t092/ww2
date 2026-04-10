/* =============================================
   Battle Room Mode — 歷史戰場競賽模式
   Firebase Realtime Database
   =============================================

   ⚠️ 使用前請先完成 Firebase 設定：
   1. 前往 https://console.firebase.google.com
   2. 建立新專案（免費 Spark 方案）
   3. 建立 Realtime Database（選 Test mode 或設定規則）
   4. 將下方 FIREBASE_CONFIG 填入您的專案資訊
   ============================================= */

/* ───── Firebase 設定區 ─────
   使用 Firebase CDN Compat 版（非 ES Module）
   ─────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBWV3rBbR5hIW3r4JGlGHG6OnXcvHw7PQI",
  authDomain:        "ww2cai.firebaseapp.com",
  databaseURL:       "https://ww2cai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "ww2cai",
  storageBucket:     "ww2cai.firebasestorage.app",
  messagingSenderId: "766809290876",
  appId:             "1:766809290876:web:3002c3ea22839c4db931f9"
};

/* ─────────────────────────────────────────────
   競賽狀態物件（全域共享）
   ───────────────────────────────────────────── */
const bs = {
  active: false,
  role: null,       // 'host' | 'player'
  roomId: null,
  nickname: null,
  db: null,
  refs: [],         // Firebase listeners（清理用）
};
window.battleState = bs;
window.battlePushScore = pushScore;

let gameStarted = false; // 防止重複觸發

/* ─────────────────────────────────────────────
   Firebase 初始化
   ───────────────────────────────────────────── */
function initFirebase() {
  if (bs.db) return true;
  if (typeof firebase === 'undefined') {
    alert('❌ Firebase SDK 未載入，請確認網路連線，並檢查 index.html 的 Firebase 腳本。');
    return false;
  }
  // 檢查是否填寫設定
  if (FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) {
    alert(
      '⚠️ 尚未填寫 Firebase 設定！\n\n' +
      '請至 battle.js 頂端，將 FIREBASE_CONFIG 中的\n' +
      'YOUR_... 替換成您的 Firebase 專案資訊。\n\n' +
      '詳見 FIREBASE_SETUP.md 說明文件。'
    );
    return false;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    bs.db = firebase.database();
    return true;
  } catch (e) {
    alert('Firebase 初始化失敗：' + e.message);
    return false;
  }
}

/* ─────────────────────────────────────────────
   畫面切換（競賽專用）
   ───────────────────────────────────────────── */
function battleSwitchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('hud').style.display = 'none';
}

/* ─────────────────────────────────────────────
   進入點
   ───────────────────────────────────────────── */
function showBattleHome() {
  battleSwitchScreen('screen-battle-home');
}

function showPlayerJoin() {
  const err = document.getElementById('join-error');
  if (err) err.style.display = 'none';
  const codeInput = document.getElementById('input-room-code');
  const nickInput = document.getElementById('input-nickname');
  if (codeInput) codeInput.value = '';
  if (nickInput) nickInput.value = '';
  battleSwitchScreen('screen-player-join');
}

/* ─────────────────────────────────────────────
   老師：建立房間
   ───────────────────────────────────────────── */
async function createRoom() {
  if (!initFirebase()) return;

  const btn = document.getElementById('btn-create-room');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 建立中...'; }

  const code = generateRoomCode();
  bs.roomId = code;
  bs.role = 'host';

  try {
    await bs.db.ref(`rooms/${code}`).set({
      status: 'waiting',
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      players: {}
    });
    bs.active = true;
    renderHostLobby();
  } catch (e) {
    alert('建立房間失敗：' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '🏟️ 建立競賽房間'; }
  }
}

function renderHostLobby() {
  battleSwitchScreen('screen-host-lobby');

  document.getElementById('host-room-code').textContent = bs.roomId;
  const baseUrl = window.location.href.split('?')[0].split('#')[0];
  const joinUrl = `${baseUrl}?join=${bs.roomId}`;
  const urlEl = document.getElementById('host-join-url');
  if (urlEl) urlEl.textContent = baseUrl;

  // 生成 QR 碼（帶入房間代碼的網址）
  const qrEl = document.getElementById('host-qr-canvas');
  if (qrEl) {
    qrEl.innerHTML = ''; // 清除舊 QR 碼
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrEl, {
        text: joinUrl,
        width: 160,
        height: 160,
        colorDark: '#0d1520',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrEl.innerHTML = '<div style="padding:10px;font-size:0.75rem;color:#888;">QR 碼載入中...</div>';
    }
  }

  // 監聽玩家列表（等待+排行榜共用）
  const ref = bs.db.ref(`rooms/${bs.roomId}/players`);
  ref.on('value', snap => {
    const players = snap.val() || {};
    updateHostWaitingList(players);
    renderHostLeaderboard(players);
  });
  bs.refs.push(ref);

  showHostSubView('waiting');
}

function showHostSubView(view) {
  document.getElementById('host-waiting-view').style.display = view === 'waiting' ? 'block' : 'none';
  document.getElementById('host-active-view').style.display = view === 'active' ? 'block' : 'none';
}

function updateHostWaitingList(players) {
  const keys = Object.keys(players);
  const count = keys.length;

  const countEl = document.getElementById('host-waiting-count');
  if (countEl) countEl.textContent = count;

  const listEl = document.getElementById('host-waiting-players');
  if (listEl) {
    listEl.innerHTML = count > 0
      ? keys.map(n => `<span class="waiting-tag">${escapeHtml(n)}</span>`).join('')
      : '<span class="lb-empty-sm">還沒有學生加入...</span>';
  }

  const startBtn = document.getElementById('btn-host-start');
  if (startBtn) startBtn.disabled = count === 0;
}

async function hostStartGame() {
  if (!bs.db || !bs.roomId) return;
  const btn = document.getElementById('btn-host-start');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 開始中...'; }
  try {
    await bs.db.ref(`rooms/${bs.roomId}/status`).set('active');
    const miniEl = document.getElementById('host-code-mini');
    if (miniEl) miniEl.textContent = bs.roomId;
    showHostSubView('active');
  } catch (e) {
    alert('開始競賽失敗：' + e.message);
    if (btn) { btn.disabled = false; btn.textContent = '🚀 開始競賽！'; }
  }
}

async function closeRoom() {
  if (!bs.db || !bs.roomId) return;
  if (!confirm('確定要結束競賽嗎？\n所有學生將看到結束畫面。')) return;
  try {
    await bs.db.ref(`rooms/${bs.roomId}/status`).set('closed');
    cleanupBattle();
    backToMenu(); // app.js function
  } catch (e) {
    alert('結束房間失敗：' + e.message);
  }
}

function copyRoomCode() {
  navigator.clipboard?.writeText(bs.roomId).then(() => {
    const btn = document.getElementById('btn-copy-code');
    if (btn) { btn.textContent = '✅ 已複製'; setTimeout(() => { btn.textContent = '📋 複製'; }, 2000); }
  }).catch(() => {
    // 舊版瀏覽器不支援 clipboard API
    const el = document.getElementById('host-room-code');
    if (el) { const sel = window.getSelection(); const r = document.createRange(); r.selectNode(el); sel.removeAllRanges(); sel.addRange(r); }
  });
}

/* ─────────────────────────────────────────────
   老師：即時排行榜渲染
   ───────────────────────────────────────────── */
function renderHostLeaderboard(players) {
  const sorted = sortPlayers(players);
  const el = document.getElementById('host-leaderboard');
  if (!el) return;

  if (sorted.length === 0) {
    el.innerHTML = '<div class="lb-empty">等待學生得分中...</div>';
    return;
  }

  el.innerHTML = sorted.map((p, i) => {
    const topClass = i < 3 ? `lb-top-${i}` : '';
    return `
      <div class="lb-row ${topClass}">
        <div class="lb-rank">${rankMedal(i)}</div>
        <div class="lb-name">${escapeHtml(p.name)}</div>
        <div class="lb-meta">Lv.${p.level}</div>
        <div class="lb-score">${p.score}<span class="lb-unit">分</span></div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────────
   學生：加入房間
   ───────────────────────────────────────────── */
async function joinRoom() {
  const codeInput = document.getElementById('input-room-code');
  const nickInput = document.getElementById('input-nickname');
  const errEl = document.getElementById('join-error');
  const joinBtn = document.getElementById('btn-join-room');

  errEl.style.display = 'none';

  const code = (codeInput.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nick = (nickInput.value || '').trim();

  const showErr = msg => {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = '⚔️ 加入競賽！'; }
  };

  if (code.length !== 6) { showErr('請輸入 6 位房間代碼'); return; }
  if (!nick) { showErr('請輸入您的競賽代號'); return; }
  if (nick.length > 12) { showErr('代號不能超過 12 個字'); return; }

  if (!initFirebase()) return;

  if (joinBtn) { joinBtn.disabled = true; joinBtn.textContent = '⏳ 連線中...'; }

  let snap;
  try {
    snap = await bs.db.ref(`rooms/${code}`).once('value');
  } catch (e) {
    showErr('連線失敗，請確認網路連線'); return;
  }

  const room = snap.val();
  if (!room) { showErr('找不到此房間代碼，請確認代碼正確'); return; }
  if (room.status === 'closed') { showErr('此競賽房間已結束'); return; }
  if (room.players?.[nick]) { showErr('此代號已被使用，請換一個代號'); return; }

  bs.roomId = code;
  bs.nickname = nick;
  bs.role = 'player';
  bs.active = true;
  gameStarted = false;

  // 加入玩家記錄
  try {
    await bs.db.ref(`rooms/${code}/players/${nick}`).set({
      score: 0, level: 1,
      lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
  } catch (e) {
    showErr('加入失敗：' + e.message); return;
  }

  // 監聽房間狀態（開始 / 結束）
  const statusRef = bs.db.ref(`rooms/${code}/status`);
  statusRef.on('value', snap => {
    if (snap.val() === 'active') onRoomActive();
    else if (snap.val() === 'closed') handleRoomClosed();
  });
  bs.refs.push(statusRef);

  // 監聽玩家分數（排行榜 + 等待室玩家清單）
  const playersRef = bs.db.ref(`rooms/${code}/players`);
  playersRef.on('value', snap => {
    const players = snap.val() || {};
    renderPlayerLeaderboard(players);
    updateWaitingPlayerList(players);
  });
  bs.refs.push(playersRef);

  // 進入等待畫面
  battleSwitchScreen('screen-player-waiting');
  setEl('waiting-room-code', code);
  setEl('waiting-nickname', nick);

  // 若房間已開始（快速加入情境），立即開始
  if (room.status === 'active') onRoomActive();
}

function updateWaitingPlayerList(players) {
  const keys = Object.keys(players);
  setEl('waiting-player-count', keys.length);
  const listEl = document.getElementById('waiting-player-list');
  if (listEl) {
    listEl.innerHTML = keys.map(n =>
      `<span class="waiting-tag${n === bs.nickname ? ' me' : ''}">${escapeHtml(n)}</span>`
    ).join('');
  }
}

/* ─────────────────────────────────────────────
   房間變成 active → 開始遊戲
   ───────────────────────────────────────────── */
function onRoomActive() {
  if (gameStarted) return;
  gameStarted = true;

  // 重置遊戲狀態（不帶入之前的本地存檔）
  if (window.resetGameState) window.resetGameState();

  // 顯示排行榜面板
  const panel = document.getElementById('leaderboard-panel');
  if (panel) panel.style.display = 'flex';

  // HUD 顯示競賽標示
  const ind = document.getElementById('hud-battle-indicator');
  if (ind) {
    ind.style.display = 'inline-flex';
    const nickEl = ind.querySelector('.battle-nick');
    const codeEl = ind.querySelector('.battle-code');
    if (nickEl) nickEl.textContent = bs.nickname;
    if (codeEl) codeEl.textContent = bs.roomId;
  }

  startFromFirst(); // app.js 函式
}

/* ─────────────────────────────────────────────
   分數推送到 Firebase
   ───────────────────────────────────────────── */
function pushScore(score, levelIndex) {
  if (!bs.active || bs.role !== 'player' || !bs.db) return;
  bs.db.ref(`rooms/${bs.roomId}/players/${bs.nickname}`).update({
    score,
    level: (levelIndex ?? 0) + 1,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP
  }).catch(() => { });
}

/* ─────────────────────────────────────────────
   學生側排行榜面板渲染
   ───────────────────────────────────────────── */
function renderPlayerLeaderboard(players) {
  const sorted = sortPlayers(players);
  const myIdx = sorted.findIndex(p => p.name === bs.nickname);

  const rankEl = document.getElementById('panel-my-rank');
  if (rankEl && myIdx >= 0) rankEl.textContent = '#' + (myIdx + 1);

  const el = document.getElementById('panel-lb-list');
  if (!el) return;

  el.innerHTML = sorted.map((p, i) => {
    const topClass = i < 3 ? `lb-top-${i}` : '';
    const meClass = p.name === bs.nickname ? ' lb-me' : '';
    return `
      <div class="lb-row ${topClass}${meClass}">
        <span class="lb-rank">${rankMedal(i)}</span>
        <span class="lb-name">${escapeHtml(p.name)}</span>
        <span class="lb-score">${p.score}</span>
      </div>`;
  }).join('');
}

function togglePanel() {
  const body = document.getElementById('panel-body');
  const btn = document.getElementById('panel-toggle');
  if (!body) return;
  const hidden = body.style.display === 'none';
  body.style.display = hidden ? '' : 'none';
  if (btn) btn.textContent = hidden ? '▼' : '◀';
}

/* ─────────────────────────────────────────────
   房間關閉 → 學生結束畫面
   ───────────────────────────────────────────── */
function handleRoomClosed() {
  if (!bs.active) return;
  const overlay = document.getElementById('battle-end-overlay');
  if (overlay) overlay.style.display = 'flex';
  setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
    cleanupBattle();
    gameStarted = false;
    backToMenu(); // app.js function
  }, 5000);
}

/* ─────────────────────────────────────────────
   清理 Firebase 監聽器與狀態
   ───────────────────────────────────────────── */
function cleanupBattle() {
  bs.refs.forEach(r => { try { r.off(); } catch (e) { } });
  bs.refs = [];
  bs.active = false;
  bs.role = null;
  bs.roomId = null;
  bs.nickname = null;

  const panel = document.getElementById('leaderboard-panel');
  if (panel) panel.style.display = 'none';

  const ind = document.getElementById('hud-battle-indicator');
  if (ind) ind.style.display = 'none';
}

/* ─────────────────────────────────────────────
   工具函式
   ───────────────────────────────────────────── */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字元 I O 1 0
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function sortPlayers(obj) {
  return Object.entries(obj)
    .map(([name, d]) => ({ name, score: d.score || 0, level: d.level || 1 }))
    .sort((a, b) => b.score - a.score);
}

function rankMedal(i) {
  return (['🥇', '🥈', '🥉'][i]) ?? (i + 1);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ──────────────────────────────────────────────
   URL 參數偵測——扫碼後自動帶入代碼
   (學生扫 QR 碼→ 頁面載入 ?join=XXXXXX →
    自動展開加入畫面且代碼已填入)
   ────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const params  = new URLSearchParams(window.location.search);
  const joinCode = (params.get('join') || '').trim().toUpperCase();
  if (joinCode.length === 6) {
    // 小延遲讓 app.js 先完成初始化
    setTimeout(() => {
      showPlayerJoin();
      const codeInput = document.getElementById('input-room-code');
      if (codeInput) codeInput.value = joinCode;
      const nickInput = document.getElementById('input-nickname');
      if (nickInput) {
        nickInput.focus();
        // 提示學生下一步
        const errEl = document.getElementById('join-error');
        if (errEl) {
          errEl.textContent = `已自動帶入房間代碼 ${joinCode}，請輸入您的競賽代號`;
          errEl.style.cssText = 'display:block; background:rgba(76,175,80,0.12); border-color:#4caf50; color:#4caf50;';
        }
      }
    }, 150);
  }
});
