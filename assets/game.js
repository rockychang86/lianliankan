// Expects a global PUZZLE_DATA object to already be defined on the page:
// { date: "2026-07-27", categories: [{ name, difficulty, words: [4 strings] }, x4] }
(function () {
  const MAX_MISTAKES = 4;
  const DIFFICULTY_ORDER = ["yellow", "green", "blue", "purple"];

  const state = {
    tiles: [],       // [{ word, categoryIndex, selected }]
    solved: [],       // categoryIndex[] in the order solved
    mistakes: 0,
    over: false,
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function init() {
    const flat = [];
    PUZZLE_DATA.categories.forEach((cat, ci) => {
      cat.words.forEach((word) => flat.push({ word, categoryIndex: ci, selected: false }));
    });
    state.tiles = shuffle(flat);
    render();
  }

  function selectedTiles() {
    return state.tiles.filter((t) => t.selected);
  }

  function toggleTile(tile) {
    if (state.over) return;
    if (!tile.selected && selectedTiles().length >= 4) return;
    tile.selected = !tile.selected;
    render();
  }

  function submit() {
    if (state.over) return;
    const sel = selectedTiles();
    if (sel.length !== 4) return;

    const categoryIndex = sel[0].categoryIndex;
    const allSameCategory = sel.every((t) => t.categoryIndex === categoryIndex);

    if (allSameCategory) {
      state.solved.push(categoryIndex);
      state.tiles = state.tiles.filter((t) => t.categoryIndex !== categoryIndex);
      render();
      if (state.solved.length === PUZZLE_DATA.categories.length) {
        state.over = true;
        showOverlay(true);
      }
      return;
    }

    // "One away" hint: 3 of the 4 selected share a category.
    const counts = {};
    sel.forEach((t) => { counts[t.categoryIndex] = (counts[t.categoryIndex] || 0) + 1; });
    const oneAway = Object.values(counts).some((c) => c === 3);

    state.mistakes += 1;
    shakeSelected();
    sel.forEach((t) => { t.selected = false; });

    if (state.mistakes >= MAX_MISTAKES) {
      state.over = true;
      setTimeout(() => { render(); showOverlay(false); }, 450);
    } else {
      setTimeout(render, 450);
      if (oneAway) flashMessage("差一点点，再想想！");
    }
  }

  function shakeSelected() {
    document.querySelectorAll(".tile.selected").forEach((el) => el.classList.add("shake"));
  }

  function flashMessage(text) {
    const el = document.getElementById("flash-message");
    if (!el) return;
    el.textContent = text;
    el.style.opacity = "1";
    setTimeout(() => { el.style.opacity = "0"; }, 1600);
  }

  function retry() {
    location.reload();
  }

  function render() {
    renderSolvedGroups();
    renderGrid();
    renderMistakes();
    renderControls();
  }

  function renderSolvedGroups() {
    const container = document.getElementById("solved-groups");
    container.innerHTML = "";
    // Always show in a stable, difficulty-sorted order once solved.
    const sortedSolved = state.solved.slice().sort(
      (a, b) => DIFFICULTY_ORDER.indexOf(PUZZLE_DATA.categories[a].difficulty) -
                 DIFFICULTY_ORDER.indexOf(PUZZLE_DATA.categories[b].difficulty)
    );
    sortedSolved.forEach((ci) => {
      const cat = PUZZLE_DATA.categories[ci];
      const div = document.createElement("div");
      div.className = `solved-group ${cat.difficulty}`;
      div.innerHTML = `<span class="cat-name">${cat.name}</span>${cat.words.join("、")}`;
      container.appendChild(div);
    });
  }

  function renderGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    state.tiles.forEach((tile) => {
      const btn = document.createElement("button");
      btn.className = "tile" + (tile.selected ? " selected" : "");
      btn.textContent = tile.word;
      btn.setAttribute("aria-pressed", tile.selected ? "true" : "false");
      btn.addEventListener("click", () => toggleTile(tile));
      grid.appendChild(btn);
    });
  }

  function renderMistakes() {
    const dotsEl = document.getElementById("mistake-dots");
    dotsEl.innerHTML = "";
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i < state.mistakes ? " used" : "");
      dotsEl.appendChild(dot);
    }
    const countEl = document.getElementById("mistake-count");
    if (countEl) countEl.textContent = String(MAX_MISTAKES - state.mistakes);
  }

  function renderControls() {
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = selectedTiles().length !== 4 || state.over;
  }

  function showOverlay(won) {
    const overlay = document.getElementById("overlay");
    overlay.classList.remove("hidden");
    if (won) {
      overlay.innerHTML = `
        <h2>🎉 全部找到了！</h2>
        <p>恭喜完成今天的词语连连看！明天再来挑战新的一期吧。</p>
        <p><a href="../archive.html">查看往期</a></p>
      `;
    } else {
      overlay.innerHTML = `
        <h2>游戏结束</h2>
        <p>没关系，再试一次！</p>
        <button class="secondary" id="retry-btn">重新开始</button>
      `;
      document.getElementById("retry-btn").addEventListener("click", retry);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("submit-btn").addEventListener("click", submit);
    init();
  });
})();
