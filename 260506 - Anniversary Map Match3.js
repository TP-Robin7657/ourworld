(function () {
  const COLS = 6;
  const ROWS = 6;
  const MOVE_LIMIT = 25;
  const TARGET_SCORE = 500;
  const BASE_POINTS = { 3: 30, 4: 60, 5: 100, 6: 150 };

  let state = null;
  let host = null;
  let onCloseFn = null;
  let onCompleteFn = null;

  function init(options) {
    host = ensureHost();
    onCloseFn = options.onClose || (() => {});
    onCompleteFn = options.onComplete || (() => {});

    state = {
      place: options.place,
      level: options.level,
      total: options.total,
      foods: options.place.food.slice(),
      grid: makeGrid(options.place.food),
      selected: null,
      score: 0,
      moves: MOVE_LIMIT,
      target: TARGET_SCORE,
      busy: false,
      cascadeMul: 1,
      tool: null,
      tools: { hammer: 3, bomb: 3 },
    };

    renderShell();
    drawBoard();
    show();
    window.GameAudio?.playBgm("match3");
  }

  function ensureHost() {
    let el = document.querySelector("#match3Root");
    if (!el) {
      el = document.createElement("div");
      el.id = "match3Root";
      el.className = "m3-root";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }
    return el;
  }

  function show() {
    host.classList.add("open");
    host.setAttribute("aria-hidden", "false");
  }

  function hide() {
    host.classList.remove("open");
    host.setAttribute("aria-hidden", "true");
  }

  function makeGrid(foods) {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let pool = foods.slice();
        if (c >= 2 && row[c - 1] === row[c - 2]) pool = pool.filter((f) => f !== row[c - 1]);
        if (r >= 2 && g[r - 1][c] === g[r - 2][c]) pool = pool.filter((f) => f !== g[r - 1][c]);
        row.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      g.push(row);
    }
    return g;
  }

  function renderShell() {
    const place = state.place;
    const banner = place.siteCard
      ? `<img class="m3-banner-img" src="./${place.siteCard}" alt="${place.name}">`
      : `<div class="m3-banner-fallback m3-${place.id}"><span class="m3-banner-emoji">${fallbackEmoji(place.id)}</span></div>`;

    host.innerHTML = `
      <div class="m3-frame">
        <div class="m3-card">
          <div class="m3-banner">
            ${banner}
            <div class="m3-banner-overlay"></div>
            <div class="m3-step-badge">
              <span class="m3-step-label">步数</span>
              <span class="m3-step-num" id="m3-moves">${state.moves}</span>
              <span class="m3-step-stage">第 ${state.level} 关</span>
            </div>
            <h2 class="m3-place-name">${place.name}</h2>
            <button class="m3-gear m3-mute" type="button" aria-label="静音切换" title="静音切换">🔊</button>
            <button class="m3-gear" type="button" aria-label="返回地图" title="返回地图">×</button>
          </div>
          <div class="m3-board-wrap">
            <div class="m3-board" id="m3-board" style="grid-template-columns: repeat(${COLS}, 1fr); grid-template-rows: repeat(${ROWS}, 1fr);"></div>
          </div>
          <div class="m3-meta">
            <div class="m3-meta-row">
              <span class="m3-meta-label">${place.foodTitle}</span>
              <span class="m3-meta-score"><b id="m3-score">0</b> / ${state.target}</span>
            </div>
            <div class="m3-progress">
              <div class="m3-progress-fill" id="m3-progress-fill"></div>
            </div>
          </div>
          <div class="m3-tools" id="m3-tools">
            <button class="m3-tool" data-tool="hammer" type="button" title="锤子：消除一个食材">
              <span class="m3-tool-icon">🔨</span>
              <span class="m3-tool-count" id="m3-tool-hammer">${state.tools.hammer}</span>
            </button>
            <button class="m3-tool" data-tool="bomb" type="button" title="炸弹：清除九宫格">
              <span class="m3-tool-icon">💣</span>
              <span class="m3-tool-count" id="m3-tool-bomb">${state.tools.bomb}</span>
            </button>
            <button class="m3-tool m3-tool-locked" type="button" disabled>
              <span class="m3-tool-icon">🔒</span>
            </button>
            <button class="m3-tool m3-tool-locked" type="button" disabled>
              <span class="m3-tool-icon">🔒</span>
            </button>
          </div>
          <div class="m3-result" id="m3-result"></div>
        </div>
      </div>
    `;

    host.querySelectorAll(".m3-gear").forEach((btn) => {
      if (btn.classList.contains("m3-mute")) return;
      btn.addEventListener("click", () => close());
    });
    const muteBtn = host.querySelector(".m3-mute");
    if (muteBtn) {
      muteBtn.textContent = window.GameAudio?.isMuted() ? "🔇" : "🔊";
      muteBtn.addEventListener("click", () => {
        window.GameAudio?.toggleMuted();
        muteBtn.textContent = window.GameAudio?.isMuted() ? "🔇" : "🔊";
      });
    }
    host.querySelectorAll(".m3-tool[data-tool]").forEach((btn) => {
      btn.addEventListener("click", () => onToolClick(btn.dataset.tool));
    });
  }

  function fallbackEmoji(id) {
    return ({
      "como": "🏞️",
      "mexico-city": "🌮",
      "new-york": "🗽",
      "seoul": "🏯",
      "liuzhou": "🍜",
      "thailand": "🛕",
      "xinjiang": "🐫",
    })[id] || "🌍";
  }

  function cellContent(emoji) {
    if (!emoji) return "";
    const path = (window.FOOD_ICONS || {})[emoji];
    if (path) return `<img class="m3-cell-img" src="./${path}" alt="${emoji}" draggable="false">`;
    return `<span class="m3-cell-fallback">${emoji}</span>`;
  }

  function drawBoard() {
    const board = document.querySelector("#m3-board");
    if (!board) return;
    board.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "m3-cell";
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.innerHTML = cellContent(state.grid[r][c]);
        if (state.selected && state.selected.r === r && state.selected.c === c) {
          cell.classList.add("m3-cell-selected");
        }
        cell.addEventListener("click", () => onCellClick(r, c));
        board.appendChild(cell);
      }
    }
    updateStats();
  }

  function updateStats() {
    const movesEl = document.querySelector("#m3-moves");
    const scoreEl = document.querySelector("#m3-score");
    const fill = document.querySelector("#m3-progress-fill");
    const hEl = document.querySelector("#m3-tool-hammer");
    const bEl = document.querySelector("#m3-tool-bomb");
    if (movesEl) movesEl.textContent = state.moves;
    if (scoreEl) scoreEl.textContent = state.score;
    if (fill) fill.style.width = `${Math.min(100, (state.score / state.target) * 100)}%`;
    if (hEl) hEl.textContent = state.tools.hammer;
    if (bEl) bEl.textContent = state.tools.bomb;
    document.querySelectorAll(".m3-tool[data-tool]").forEach((btn) => {
      btn.classList.toggle("m3-tool-active", state.tool === btn.dataset.tool);
      const t = btn.dataset.tool;
      btn.disabled = state.tools[t] <= 0;
    });
  }

  function onToolClick(tool) {
    if (state.busy) return;
    if (state.tools[tool] <= 0) return;
    state.tool = state.tool === tool ? null : tool;
    state.selected = null;
    drawBoard();
  }

  function onCellClick(r, c) {
    if (state.busy) return;
    if (state.tool === "hammer") {
      useHammer(r, c);
      return;
    }
    if (state.tool === "bomb") {
      useBomb(r, c);
      return;
    }
    if (!state.selected) {
      state.selected = { r, c };
      drawBoard();
      return;
    }
    const { r: sr, c: sc } = state.selected;
    if (sr === r && sc === c) {
      state.selected = null;
      drawBoard();
      return;
    }
    if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) {
      state.selected = { r, c };
      drawBoard();
      return;
    }
    trySwap(sr, sc, r, c);
  }

  async function trySwap(r1, c1, r2, c2) {
    state.busy = true;
    state.selected = null;
    swap(r1, c1, r2, c2);
    drawBoard();
    await sleep(160);

    let matches = findMatches();
    if (!matches.length) {
      swap(r1, c1, r2, c2);
      const cellA = cellEl(r1, c1);
      const cellB = cellEl(r2, c2);
      cellA && cellA.classList.add("m3-shake");
      cellB && cellB.classList.add("m3-shake");
      await sleep(200);
      drawBoard();
      state.busy = false;
      return;
    }

    state.moves--;
    state.cascadeMul = 1;
    while (matches.length) {
      await processMatches(matches);
      matches = findMatches();
      state.cascadeMul++;
    }
    state.cascadeMul = 1;
    updateStats();
    afterTurn();
  }

  async function useHammer(r, c) {
    state.busy = true;
    state.tools.hammer--;
    state.tool = null;
    window.GameAudio?.sfx("popSoft", 0.95);
    const el = cellEl(r, c);
    el && el.classList.add("m3-cell-pop");
    await sleep(220);
    state.grid[r][c] = null;
    drop();
    drawBoard();
    state.cascadeMul = 1;
    let matches = findMatches();
    while (matches.length) {
      await processMatches(matches);
      matches = findMatches();
      state.cascadeMul++;
    }
    state.cascadeMul = 1;
    updateStats();
    afterTurn(true);
  }

  async function useBomb(r, c) {
    state.busy = true;
    state.tools.bomb--;
    state.tool = null;
    window.GameAudio?.sfx("combo", 1.0);
    const popped = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
          popped.push([rr, cc]);
          const el = cellEl(rr, cc);
          el && el.classList.add("m3-cell-pop");
        }
      }
    }
    state.score += popped.length * 20;
    await sleep(280);
    popped.forEach(([rr, cc]) => (state.grid[rr][cc] = null));
    drop();
    drawBoard();
    state.cascadeMul = 1;
    let matches = findMatches();
    while (matches.length) {
      await processMatches(matches);
      matches = findMatches();
      state.cascadeMul++;
    }
    state.cascadeMul = 1;
    updateStats();
    afterTurn(true);
  }

  function afterTurn(skipMoveCheck) {
    if (state.score >= state.target) {
      win();
      return;
    }
    if (!skipMoveCheck && state.moves <= 0) {
      lose();
      return;
    }
    state.busy = false;
  }

  function swap(r1, c1, r2, c2) {
    const t = state.grid[r1][c1];
    state.grid[r1][c1] = state.grid[r2][c2];
    state.grid[r2][c2] = t;
  }

  function findMatches() {
    const matches = [];
    for (let r = 0; r < ROWS; r++) {
      let start = 0;
      for (let c = 1; c <= COLS; c++) {
        if (c === COLS || state.grid[r][c] !== state.grid[r][start] || state.grid[r][start] === null) {
          if (state.grid[r][start] !== null && c - start >= 3) {
            matches.push({ dir: "row", r, cStart: start, cEnd: c - 1, len: c - start });
          }
          start = c;
        }
      }
    }
    for (let c = 0; c < COLS; c++) {
      let start = 0;
      for (let r = 1; r <= ROWS; r++) {
        if (r === ROWS || state.grid[r][c] !== state.grid[start][c] || state.grid[start][c] === null) {
          if (state.grid[start][c] !== null && r - start >= 3) {
            matches.push({ dir: "col", c, rStart: start, rEnd: r - 1, len: r - start });
          }
          start = r;
        }
      }
    }
    return matches;
  }

  async function processMatches(matches) {
    const cells = new Set();
    let maxLen = 0;
    for (const m of matches) {
      const len = Math.min(m.len, 6);
      if (len > maxLen) maxLen = len;
      const base = BASE_POINTS[len] || BASE_POINTS[6];
      state.score += Math.round(base * state.cascadeMul);
      if (m.dir === "row") {
        for (let c = m.cStart; c <= m.cEnd; c++) cells.add(`${m.r},${c}`);
      } else {
        for (let r = m.rStart; r <= m.rEnd; r++) cells.add(`${r},${m.c}`);
      }
    }
    if (state.cascadeMul > 1 || maxLen >= 4) {
      window.GameAudio?.sfx("combo", 0.9);
    } else {
      window.GameAudio?.sfx("pop", 0.95);
    }
    cells.forEach((k) => {
      const [r, c] = k.split(",").map(Number);
      const el = cellEl(r, c);
      el && el.classList.add("m3-cell-pop");
    });
    updateStats();
    await sleep(260);
    cells.forEach((k) => {
      const [r, c] = k.split(",").map(Number);
      state.grid[r][c] = null;
    });
    drop();
    drawBoard();
    await sleep(220);
  }

  function drop() {
    for (let c = 0; c < COLS; c++) {
      let write = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (state.grid[r][c] != null) {
          if (write !== r) {
            state.grid[write][c] = state.grid[r][c];
            state.grid[r][c] = null;
          }
          write--;
        }
      }
      for (let r = write; r >= 0; r--) {
        state.grid[r][c] = state.foods[Math.floor(Math.random() * state.foods.length)];
      }
    }
  }

  function cellEl(r, c) {
    return document.querySelector(`.m3-cell[data-r="${r}"][data-c="${c}"]`);
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function win() {
    state.busy = true;
    const place = state.place;
    const result = document.querySelector("#m3-result");
    const stars = state.score >= state.target * 1.6 ? 3 : state.score >= state.target * 1.2 ? 2 : 1;
    const isFinal = state.level === state.total;
    if (isFinal) {
      window.GameAudio?.sfx("victory", 1.0);
    } else {
      window.GameAudio?.sfx("levelComplete", 1.0);
      setTimeout(() => window.GameAudio?.sfx("win", 0.95), 220);
    }
    const bg = place.siteCard
      ? `<img class="m3-win-bg" src="./${place.siteCard}" alt="">`
      : `<div class="m3-win-bg m3-win-bg-fallback m3-${place.id}"></div>`;
    result.innerHTML = `
      <div class="m3-result-card m3-win ${isFinal ? "m3-win-final" : ""}">
        ${bg}
        <div class="m3-win-veil"></div>
        <div class="m3-win-content">
          <p class="m3-win-place">${place.name}<span class="m3-win-stage">第 ${state.level} 关</span></p>
          <h3 class="m3-win-title">${isFinal ? "通关成功！" : "通关！"}</h3>
          <div class="m3-win-stars">
            <span class="${stars >= 1 ? "lit" : ""}">★</span>
            <span class="${stars >= 2 ? "lit" : ""}">★</span>
            <span class="${stars >= 3 ? "lit" : ""}">★</span>
          </div>
          <div class="m3-win-rewards">
            <div class="m3-reward"><span class="m3-reward-icon">🪙</span><span class="m3-reward-num">${100 * stars}</span></div>
            <div class="m3-reward"><span class="m3-reward-icon">💎</span><span class="m3-reward-num">${stars}</span></div>
            <div class="m3-reward"><span class="m3-reward-icon">🎁</span><span class="m3-reward-num">1</span></div>
          </div>
          <button class="m3-win-btn" id="m3-next">${isFinal ? "查收周年惊喜 💕" : "继续"}</button>
        </div>
      </div>
    `;
    result.classList.add("m3-result-show");
    document.querySelector("#m3-next").addEventListener("click", () => {
      result.classList.remove("m3-result-show");
      onCompleteFn(place.id, stars);
    });
  }

  function lose() {
    state.busy = true;
    const result = document.querySelector("#m3-result");
    result.innerHTML = `
      <div class="m3-result-card m3-lose">
        <h3>差一点点！</h3>
        <p>本关需要 ${state.target} 分，再来一次？</p>
        <div class="m3-result-actions">
          <button class="m3-result-btn ghost" id="m3-back">回地图</button>
          <button class="m3-result-btn" id="m3-retry">再来一次</button>
        </div>
      </div>
    `;
    result.classList.add("m3-result-show");
    document.querySelector("#m3-retry").addEventListener("click", () => {
      result.classList.remove("m3-result-show");
      state.score = 0;
      state.moves = MOVE_LIMIT;
      state.tools = { hammer: 3, bomb: 3 };
      state.tool = null;
      state.selected = null;
      state.cascadeMul = 1;
      state.grid = makeGrid(state.foods);
      state.busy = false;
      drawBoard();
    });
    document.querySelector("#m3-back").addEventListener("click", () => {
      result.classList.remove("m3-result-show");
      close();
    });
  }

  function close() {
    hide();
    onCloseFn();
  }

  window.Match3 = { init, close };
})();
