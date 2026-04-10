/* =============================================
   Game Engine — 歷史時空探險 Ch3
   ============================================= */

/* ---------- State ---------- */
let state = {
  score: 0,
  currentLevel: 0,
  currentStep: 0,
  levelErrors: {},
  levelScores: {},
  badges: [],
  completed: [],
  challengeState: {}
};

/* ---------- Reset State（競賽模式：清除本地存檔記憶）---------- */
function resetGameState() {
  state.score        = 0;
  state.badges       = [];
  state.completed    = [];
  state.levelErrors  = {};
  state.levelScores  = {};
  state.challengeState = {};
  updateHud();
  renderHudBadges();
}
window.resetGameState = resetGameState;

const SCORE_CORRECT = 10;
const SCORE_WRONG = -5;
const BONUS_PERFECT = 30;
const HINT_AFTER = 3;

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderLevelGrid();
  renderHudBadges();
  updateHud();
});

/* ---------- Storage ---------- */
function saveState() {
  if (window.battleState?.active) return; // 競賽模式不寫入本地存檔
  try { localStorage.setItem('ch03_state', JSON.stringify(state)); } catch(e){}
}
function loadState() {
  try {
    const s = localStorage.getItem('ch03_state');
    if (s) { const p = JSON.parse(s); Object.assign(state, p); }
  } catch(e){}
}

/* ---------- Screen Management ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('hud').style.display = id === 'screen-game' ? 'flex' : 'none';
}

function backToMenu() {
  showScreen('screen-welcome');
  renderLevelGrid();
}

/* ---------- Level Grid ---------- */
function renderLevelGrid() {
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const done = state.completed.includes(lv.id);
    const unlocked = i === 0 || state.completed.includes(LEVELS[i-1].id);
    const card = document.createElement('div');
    card.className = `level-card${done?' completed':''}${!unlocked?' locked':''}`;
    card.innerHTML = `
      <div class="level-emoji">${lv.emoji}</div>
      <div class="level-name">第${lv.id}關：${lv.title}</div>
      <div class="level-desc">${lv.challenges.length} 個挑戰任務</div>
      <div class="level-status">${done?'✅':unlocked?'➡️':'🔒'}</div>`;
    if (unlocked) card.onclick = () => startLevel(i);
    grid.appendChild(card);
  });
}

function startFromFirst() {
  const firstUncompleted = LEVELS.findIndex((lv,i) =>
    !state.completed.includes(lv.id) && (i === 0 || state.completed.includes(LEVELS[i-1].id)));
  startLevel(Math.max(0, firstUncompleted));
}

/* ---------- Level Flow ---------- */
function startLevel(levelIndex) {
  state.currentLevel = levelIndex;
  state.currentStep = 0;
  state.levelErrors[levelIndex] = 0;
  state.levelScores[levelIndex] = 0;
  state.challengeState = {};
  showScreen('screen-game');
  renderStep();
}

function getTotalSteps(lv) { return 1 + lv.challenges.length + 1; } // story + challenges + complete

function renderStepBar() {
  const lv = LEVELS[state.currentLevel];
  const total = getTotalSteps(lv);
  const bar = document.getElementById('step-bar');
  bar.innerHTML = '';
  for (let i = 0; i < total; i++) {
    if (i > 0) { const ln = document.createElement('div'); ln.className = `step-line${i<=state.currentStep?' done':''}`; bar.appendChild(ln); }
    const d = document.createElement('div');
    d.className = `step-dot${i===state.currentStep?' active':''}${i<state.currentStep?' done':''}`;
    bar.appendChild(d);
  }
}

function renderStep() {
  const lv = LEVELS[state.currentLevel];
  const total = getTotalSteps(lv);
  document.getElementById('hud-level').textContent = `第 ${lv.id} 關：${lv.title}`;
  renderStepBar();
  const content = document.getElementById('game-content');
  const nav = document.getElementById('game-nav');

  if (state.currentStep === 0) {
    // Story
    content.innerHTML = `
      <div class="story-card">
        <div class="story-header"><span class="emoji">${lv.emoji}</span><span class="title">${lv.title}</span></div>
        ${lv.image ? `<img src="${lv.image}" class="story-image" alt="Level Image">` : ''}
        <div class="story-text mt-2">${lv.story}</div>
      </div>`;
    nav.innerHTML = `<button class="btn btn-primary" onclick="nextStep()">開始挑戰 ➡️</button>`;
  } else if (state.currentStep <= lv.challenges.length) {
    // Challenge
    const ch = lv.challenges[state.currentStep - 1];
    state.challengeState = { answered: false, errors: 0 };
    content.innerHTML = `<div class="challenge-container" id="challenge-area"></div>`;
    nav.innerHTML = '';
    renderChallenge(ch, document.getElementById('challenge-area'));
  } else {
    // Level complete
    renderLevelComplete(lv);
    nav.innerHTML = '';
  }
  updateHud();
}

function nextStep() {
  const lv = LEVELS[state.currentLevel];
  state.currentStep++;
  if (state.currentStep >= getTotalSteps(lv)) {
    state.currentStep = getTotalSteps(lv) - 1; // stay on complete
  }
  renderStep();
}

function nextLevelOrFinish() {
  const lv = LEVELS[state.currentLevel];
  if (!state.completed.includes(lv.id)) { state.completed.push(lv.id); }
  // Award badge
  if (!state.badges.find(b => b.icon === lv.badge.icon)) { state.badges.push(lv.badge); }
  saveState();
  if (state.currentLevel < LEVELS.length - 1) {
    startLevel(state.currentLevel + 1);
  } else {
    showAchievement();
  }
}

/* ---------- Level Complete ---------- */
function renderLevelComplete(lv) {
  const errors = state.levelErrors[state.currentLevel] || 0;
  const perfect = errors === 0;
  if (perfect) { addScore(BONUS_PERFECT); }
  const content = document.getElementById('game-content');
  content.innerHTML = `
    <div class="level-complete">
      <div class="big-badge">${lv.badge.icon}</div>
      <h2>🎉 恭喜過關！</h2>
      <p class="score-summary">獲得徽章「${lv.badge.name}」</p>
      ${perfect ? '<p class="perfect-bonus">🌟 完美通關 +30分！</p>' : ''}
      <button class="btn btn-primary btn-lg mt-2" onclick="nextLevelOrFinish()">
        ${state.currentLevel < LEVELS.length - 1 ? '前往下一關 ➡️' : '🏆 查看成績'}
      </button>
      <br><button class="btn btn-secondary mt-1" onclick="backToMenu()">返回選單</button>
    </div>`;
  spawnConfetti();
}

/* ---------- Achievement Screen ---------- */
function showAchievement() {
  showScreen('screen-achievement');
  const pct = state.score / getMaxScore() * 100;
  let rank = '🔄 新兵再訓練';
  if (pct >= 90) rank = '🌟 時空戰略大師';
  else if (pct >= 70) rank = '🎖️ 同盟國情報官';
  else if (pct >= 50) rank = '📚 歷史見習生';
  document.getElementById('final-rank').textContent = rank;
  document.getElementById('final-score').textContent = state.score + ' 分';
  const fb = document.getElementById('final-badges');
  fb.innerHTML = state.badges.map(b => `
    <div class="final-badge-card"><div class="badge-icon">${b.icon}</div><div class="badge-name">${b.name}</div></div>`).join('');
  spawnConfetti();
}

function getMaxScore() {
  let total = 0;
  LEVELS.forEach(lv => {
    lv.challenges.forEach(ch => {
      const n = ch.type === 'sorting' ? ch.items.length :
                ch.type === 'categorize' ? ch.items.length :
                ch.pairs ? ch.pairs.length : 0;
      total += n * SCORE_CORRECT;
    });
    total += BONUS_PERFECT;
  });
  return total;
}

/* ---------- HUD ---------- */
function updateHud() {
  document.getElementById('hud-score-value').textContent = state.score;
}

function renderHudBadges() {
  const container = document.getElementById('hud-badges');
  container.innerHTML = LEVELS.map(lv => {
    const earned = state.badges.find(b => b.icon === lv.badge.icon);
    return `<div class="badge-slot${earned?' earned':''}" title="${lv.badge.name}">${lv.badge.icon}</div>`;
  }).join('');
}

/* ---------- Score ---------- */
function addScore(pts) {
  state.score += pts;
  if (state.score < 0) state.score = 0;
  updateHud();
  saveState();
  // 競賽模式：同步分數到 Firebase
  if (window.battleState?.active) {
    window.battlePushScore?.(state.score, state.currentLevel);
  }
}

function showScoreFloat(x, y, pts) {
  const el = document.createElement('div');
  el.className = `score-float ${pts > 0 ? 'positive' : 'negative'}`;
  el.textContent = (pts > 0 ? '+' : '') + pts;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* ---------- Confetti ---------- */
function spawnConfetti() {
  const colors = ['#d4a847','#ffd700','#4caf50','#e04848','#4a90d9','#9b59b6'];
  for (let i = 0; i < 50; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = Math.random() * 1.5 + 's';
    c.style.animationDuration = (2 + Math.random() * 2) + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

/* =============================================
   Challenge Renderers
   ============================================= */

function renderChallenge(ch, container) {
  container.innerHTML = `
    <div class="challenge-title">${ch.title}</div>
    <div class="challenge-instruction">${ch.instruction}</div>
    <div id="challenge-body"></div>
    <div class="feedback" id="feedback"></div>`;
  const body = document.getElementById('challenge-body');

  switch(ch.type) {
    case 'sorting': renderSorting(ch, body); break;
    case 'matching': renderMatching(ch, body); break;
    case 'categorize': renderCategorize(ch, body); break;
    case 'connect': renderConnect(ch, body); break;
    case 'map-drag': renderMapDrag(ch, body); break;
  }
}

/* ---- Map Drag Challenge ---- */
function renderMapDrag(ch, body) {
  const points = ch.points;
  const shuffledItems = shuffle([...points]);
  let matchedCount = 0;

  let html = `<div class="drag-pool" id="map-pool"></div>
    <div class="map-container" id="map-container">
      <img src="${ch.bgImage}" alt="Map">`;
  
  points.forEach(p => {
    html += `<div class="map-drop-point drop-zone" data-answer="${p.answer}" style="left:${p.x}%; top:${p.y}%; transform: translate(-50%, -50%);">目標區域</div>`;
  });
  html += `</div>`;
  html += '<div class="text-center mt-2"><button class="btn btn-primary hidden" id="btn-next-map">繼續 ➡️</button></div>';
  body.innerHTML = html;

  const pool = document.getElementById('map-pool');
  shuffledItems.forEach(p => {
    const el = document.createElement('div');
    el.className = 'drag-item';
    el.textContent = p.answer;
    el.dataset.value = p.answer;
    pool.appendChild(el);
  });

  setupDragSystem(pool, document.getElementById('map-container'), (dragEl, dropEl) => {
    const answer = dropEl.dataset.answer;
    const dragged = dragEl.dataset.value;
    const rect = dropEl.getBoundingClientRect();

    if (dragged === answer) {
      dropEl.textContent = dragged;
      dropEl.classList.add('filled', 'correct');
      dragEl.classList.add('placed');
      addScore(SCORE_CORRECT);
      showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_CORRECT);
      matchedCount++;
      if (matchedCount === points.length) {
        showFeedback(true);
        addNextButton();
      }
    } else {
      dropEl.classList.add('incorrect');
      state.levelErrors[state.currentLevel] = (state.levelErrors[state.currentLevel]||0) + 1;
      addScore(SCORE_WRONG);
      showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_WRONG);
      setTimeout(() => dropEl.classList.remove('incorrect'), 500);
      const errs = state.levelErrors[state.currentLevel] || 0;
      if (errs > 0 && errs % HINT_AFTER === 0) showHint(answer);
    }
  });
}

/* ---- Sorting Challenge ---- */
function renderSorting(ch, body) {
  const correctOrder = [...ch.items];
  const shuffled = shuffle([...ch.items]);
  const placed = new Array(correctOrder.length).fill(null);

  body.innerHTML = `
    <div class="drag-pool" id="sort-pool"></div>
    <div class="sort-slots" id="sort-slots"></div>
    <div class="text-center mt-2">
      <button class="btn btn-primary" id="btn-check-sort" disabled>確認答案 ✅</button>
    </div>`;

  const pool = document.getElementById('sort-pool');
  const slots = document.getElementById('sort-slots');

  // Render slots
  correctOrder.forEach((_, i) => {
    const row = document.createElement('div');
    row.className = 'sort-slot';
    row.innerHTML = `<div class="sort-number">${i+1}</div>
      <div class="drop-zone" data-slot="${i}">拖入第 ${i+1} 個事件</div>`;
    slots.appendChild(row);
  });

  // Render draggable items
  shuffled.forEach((text, i) => {
    const item = document.createElement('div');
    item.className = 'drag-item';
    item.textContent = text;
    item.dataset.value = text;
    pool.appendChild(item);
  });

  // Setup drag
  setupDragSystem(pool, slots, (dragEl, dropEl) => {
    const slotIdx = parseInt(dropEl.dataset.slot);
    // If slot already has item, return it to pool
    if (placed[slotIdx]) {
      const old = pool.querySelector(`.drag-item[data-value="${CSS.escape(placed[slotIdx])}"]`);
      if (old) { old.classList.remove('placed'); }
      else {
        const ret = document.createElement('div');
        ret.className = 'drag-item';
        ret.textContent = placed[slotIdx];
        ret.dataset.value = placed[slotIdx];
        pool.appendChild(ret);
        initDragItem(ret);
      }
    }
    placed[slotIdx] = dragEl.dataset.value;
    dropEl.textContent = dragEl.dataset.value;
    dropEl.classList.add('filled');
    dragEl.classList.add('placed');

    // Enable check if all slots filled
    document.getElementById('btn-check-sort').disabled = placed.includes(null);
  });

  document.getElementById('btn-check-sort').onclick = () => {
    let allCorrect = true;
    const dropZones = slots.querySelectorAll('.drop-zone');
    dropZones.forEach((dz, i) => {
      const isCorrect = placed[i] === correctOrder[i];
      dz.classList.add(isCorrect ? 'correct' : 'incorrect');
      if (!isCorrect) {
        allCorrect = false;
        state.levelErrors[state.currentLevel] = (state.levelErrors[state.currentLevel]||0) + 1;
        addScore(SCORE_WRONG);
      } else {
        addScore(SCORE_CORRECT);
      }
    });
    showFeedback(allCorrect);
    if (!allCorrect) {
      // Allow retry after delay
      setTimeout(() => {
        dropZones.forEach((dz, i) => {
          if (dz.classList.contains('incorrect')) {
            const val = placed[i];
            placed[i] = null;
            dz.textContent = `拖入第 ${i+1} 個事件`;
            dz.classList.remove('filled','incorrect');
            // Return item to pool
            const ret = document.createElement('div');
            ret.className = 'drag-item';
            ret.textContent = val;
            ret.dataset.value = val;
            pool.appendChild(ret);
            initDragItem(ret);
          }
        });
        document.getElementById('btn-check-sort').disabled = true;
        document.getElementById('feedback').classList.remove('show');
      }, 1500);
    } else {
      addNextButton();
    }
  };
}

/* ---- Matching Challenge ---- */
function renderMatching(ch, body) {
  const pairs = ch.pairs;
  const shuffledLeft = shuffle([...pairs]);
  const shuffledRight = shuffle([...pairs]);
  const matched = {};

  let html = '<div class="drag-pool" id="match-pool"></div><div class="matching-grid" id="match-grid">';
  shuffledRight.forEach((p, i) => {
    html += `<div class="matching-row">
      <div class="match-label">${p.right}</div>
      <div class="drop-zone" data-answer="${p.left}" data-idx="${i}">拖入對應項目</div>
    </div>`;
  });
  html += '</div><div class="text-center mt-2"><button class="btn btn-primary hidden" id="btn-next-match">繼續 ➡️</button></div>';
  body.innerHTML = html;

  const pool = document.getElementById('match-pool');
  shuffledLeft.forEach(p => {
    const item = document.createElement('div');
    item.className = 'drag-item';
    item.textContent = p.left;
    item.dataset.value = p.left;
    pool.appendChild(item);
  });

  const grid = document.getElementById('match-grid');
  setupDragSystem(pool, grid, (dragEl, dropEl) => {
    const answer = dropEl.dataset.answer;
    const dragged = dragEl.dataset.value;
    const rect = dropEl.getBoundingClientRect();

    if (dragged === answer) {
      dropEl.textContent = dragged;
      dropEl.classList.add('filled', 'correct');
      dragEl.classList.add('placed');
      addScore(SCORE_CORRECT);
      showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_CORRECT);
      matched[answer] = true;
      if (Object.keys(matched).length === pairs.length) {
        showFeedback(true);
        addNextButton();
      }
    } else {
      dropEl.classList.add('incorrect');
      state.levelErrors[state.currentLevel] = (state.levelErrors[state.currentLevel]||0) + 1;
      addScore(SCORE_WRONG);
      showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_WRONG);
      setTimeout(() => dropEl.classList.remove('incorrect'), 500);
      // Check hint
      const errs = state.levelErrors[state.currentLevel] || 0;
      if (errs > 0 && errs % HINT_AFTER === 0) showHint(answer);
    }
  });
}

/* ---- Categorize Challenge ---- */
function renderCategorize(ch, body) {
  const items = ch.items;
  const cats = ch.categories;
  const shuffledItems = shuffle([...items]);
  const assignments = {};
  const correctCount = items.length;
  let matchedCount = 0;

  let html = '<div class="drag-pool" id="cat-pool"></div><div class="category-layout">';
  cats.forEach((cat, ci) => {
    html += `<div class="category-box" data-cat="${ci}" id="cat-box-${ci}">
      <div class="category-box-title">${cat}</div>
      <div class="category-drop-area" data-cat="${ci}"></div>
    </div>`;
  });
  html += '</div>';
  body.innerHTML = html;

  const pool = document.getElementById('cat-pool');
  shuffledItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'drag-item';
    el.textContent = item.text;
    el.dataset.value = item.text;
    el.dataset.correctCat = item.cat;
    pool.appendChild(el);
  });

  // Setup drop on category areas
  cats.forEach((_, ci) => {
    const area = document.querySelector(`.category-drop-area[data-cat="${ci}"]`);
    const box = document.getElementById(`cat-box-${ci}`);

    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drag-over'); });
    box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
    box.addEventListener('drop', e => {
      e.preventDefault();
      box.classList.remove('drag-over');
      handleCatDrop(ci, area);
    });

    // Pointer events for touch
    box._catIdx = ci;
    box._area = area;
  });

  setupCatDragSystem(pool, cats.map((_, ci) => document.getElementById(`cat-box-${ci}`)), (dragEl, catIdx) => {
    const correctCat = parseInt(dragEl.dataset.correctCat);
    const area = document.querySelector(`.category-drop-area[data-cat="${catIdx}"]`);
    const rect = area.getBoundingClientRect();

    if (catIdx === correctCat) {
      const placed = document.createElement('div');
      placed.className = 'drag-item correct';
      placed.textContent = dragEl.dataset.value;
      area.appendChild(placed);
      dragEl.remove();
      addScore(SCORE_CORRECT);
      showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_CORRECT);
      matchedCount++;
      if (matchedCount === correctCount) {
        showFeedback(true);
        addNextButton();
      }
    } else {
      dragEl.classList.add('incorrect');
      state.levelErrors[state.currentLevel] = (state.levelErrors[state.currentLevel]||0) + 1;
      addScore(SCORE_WRONG);
      showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_WRONG);
      setTimeout(() => dragEl.classList.remove('incorrect'), 500);
      const errs = state.levelErrors[state.currentLevel] || 0;
      if (errs > 0 && errs % HINT_AFTER === 0) showHint(dragEl.dataset.value);
    }
  });
}

/* ---- Connect (Line Matching) Challenge ---- */
function renderConnect(ch, body) {
  const pairs = ch.pairs;
  const shuffledL = shuffle([...pairs]);
  const shuffledR = shuffle([...pairs]);
  let selectedLeft = null;
  const connections = {};
  let matchedCount = 0;

  body.innerHTML = `
    <div class="connect-container" id="connect-container">
      <div class="connect-column" id="connect-left"></div>
      <div class="connect-column" id="connect-right"></div>
      <svg class="connect-svg" id="connect-svg"></svg>
    </div>`;

  const leftCol = document.getElementById('connect-left');
  const rightCol = document.getElementById('connect-right');

  shuffledL.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'connect-item';
    el.textContent = p.left;
    el.dataset.value = p.left;
    el.dataset.side = 'left';
    el.onclick = () => selectConnect(el);
    leftCol.appendChild(el);
  });

  shuffledR.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'connect-item';
    el.textContent = p.right;
    el.dataset.value = p.right;
    el.dataset.matchKey = p.left;
    el.dataset.side = 'right';
    el.onclick = () => selectConnect(el);
    rightCol.appendChild(el);
  });

  function selectConnect(el) {
    if (el.classList.contains('matched')) return;

    if (el.dataset.side === 'left') {
      leftCol.querySelectorAll('.connect-item').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      selectedLeft = el;
    } else if (selectedLeft) {
      const leftVal = selectedLeft.dataset.value;
      const matchKey = el.dataset.matchKey;
      const rect = el.getBoundingClientRect();

      if (leftVal === matchKey) {
        selectedLeft.classList.remove('selected');
        selectedLeft.classList.add('matched');
        el.classList.add('matched');
        drawLine(selectedLeft, el);
        addScore(SCORE_CORRECT);
        showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_CORRECT);
        matchedCount++;
        selectedLeft = null;
        if (matchedCount === pairs.length) {
          showFeedback(true);
          addNextButton();
        }
      } else {
        el.classList.add('wrong');
        state.levelErrors[state.currentLevel] = (state.levelErrors[state.currentLevel]||0) + 1;
        addScore(SCORE_WRONG);
        showScoreFloat(rect.left + rect.width/2, rect.top, SCORE_WRONG);
        setTimeout(() => el.classList.remove('wrong'), 500);
        const errs = state.levelErrors[state.currentLevel] || 0;
        if (errs > 0 && errs % HINT_AFTER === 0) showHint(leftVal);
      }
    }
  }

  function drawLine(leftEl, rightEl) {
    const svg = document.getElementById('connect-svg');
    const container = document.getElementById('connect-container');
    const cRect = container.getBoundingClientRect();
    const lRect = leftEl.getBoundingClientRect();
    const rRect = rightEl.getBoundingClientRect();

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', lRect.right - cRect.left);
    line.setAttribute('y1', lRect.top + lRect.height/2 - cRect.top);
    line.setAttribute('x2', rRect.left - cRect.left);
    line.setAttribute('y2', rRect.top + rRect.height/2 - cRect.top);
    svg.appendChild(line);
  }
}

/* =============================================
   Drag & Drop Engine (Pointer Events)
   ============================================= */
let dragState = { active: false, el: null, ghost: null, startX: 0, startY: 0, dropTargets: [], onDrop: null };

function setupDragSystem(poolEl, targetsParent, onDrop) {
  poolEl.querySelectorAll('.drag-item').forEach(item => initDragItem(item));
  dragState.dropTargets = Array.from(targetsParent.querySelectorAll('.drop-zone'));
  dragState.onDrop = onDrop;
  dragState.poolEl = poolEl;
  dragState.targetsParent = targetsParent;
}

function setupCatDragSystem(poolEl, catBoxes, onDrop) {
  poolEl.querySelectorAll('.drag-item').forEach(item => initDragItem(item));
  dragState.dropTargets = catBoxes;
  dragState.onDrop = (dragEl, dropEl) => {
    const catIdx = parseInt(dropEl.dataset.cat !== undefined ? dropEl.dataset.cat : dropEl._catIdx);
    onDrop(dragEl, catIdx);
  };
  dragState.poolEl = poolEl;
  dragState.isCat = true;
}

function initDragItem(item) {
  if (item._dragInit) return;
  item._dragInit = true;
  item.addEventListener('pointerdown', onPointerDown, { passive: false });
}

function onPointerDown(e) {
  if (e.target.classList.contains('placed') || e.target.classList.contains('correct')) return;
  e.preventDefault();
  const el = e.currentTarget;
  el.setPointerCapture(e.pointerId);

  dragState.active = true;
  dragState.el = el;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;

  // Create ghost
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.textContent = el.textContent;
  ghost.style.left = e.clientX + 'px';
  ghost.style.top = e.clientY + 'px';
  document.body.appendChild(ghost);
  dragState.ghost = ghost;

  el.classList.add('dragging');

  el.addEventListener('pointermove', onPointerMove, { passive: false });
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
  if (!dragState.active) return;
  e.preventDefault();
  dragState.ghost.style.left = e.clientX + 'px';
  dragState.ghost.style.top = e.clientY + 'px';

  // Highlight target under pointer
  dragState.dropTargets.forEach(t => t.classList.remove('drag-over'));
  const target = getTargetUnderPoint(e.clientX, e.clientY);
  if (target) target.classList.add('drag-over');
}

function onPointerUp(e) {
  if (!dragState.active) return;
  e.preventDefault();
  dragState.active = false;
  dragState.el.classList.remove('dragging');

  dragState.el.removeEventListener('pointermove', onPointerMove);
  dragState.el.removeEventListener('pointerup', onPointerUp);
  dragState.el.removeEventListener('pointercancel', onPointerUp);

  dragState.dropTargets.forEach(t => t.classList.remove('drag-over'));

  const target = getTargetUnderPoint(e.clientX, e.clientY);
  if (target && dragState.onDrop) {
    dragState.onDrop(dragState.el, target);
  }

  if (dragState.ghost) { dragState.ghost.remove(); dragState.ghost = null; }
}

function getTargetUnderPoint(x, y) {
  for (const t of dragState.dropTargets) {
    const r = t.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return t;
  }
  return null;
}

/* =============================================
   Helpers
   ============================================= */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showFeedback(success) {
  const fb = document.getElementById('feedback');
  if (!fb) return;
  fb.className = `feedback show ${success ? 'success' : 'error'}`;
  fb.innerHTML = success ? '✅ 全部正確！做得好！' : '❌ 有些答案不正確，請重試紅色標記的項目。';
}

function showHint(keyword) {
  const fb = document.getElementById('feedback');
  if (!fb) return;
  fb.className = 'feedback show hint';
  fb.innerHTML = `💡 提示：請回想課本中關於「${keyword}」的描述。`;
}

function addNextButton() {
  const nav = document.getElementById('game-nav');
  nav.innerHTML = `<button class="btn btn-success btn-lg" onclick="nextStep()">繼續 ➡️</button>`;
}
