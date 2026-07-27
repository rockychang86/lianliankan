// Expects a global PUZZLE_DATA object to already be defined on the page:
// { date: "2026-07-27", categories: [{ name, difficulty, words: [4 strings] }, x4] }
(function () {
  const MAX_MISTAKES = 4;
  const CORRECT_FLASH_MS = 550;

  const state = {
    tiles: [],        // [{ word, categoryIndex, selected }]
    solved: [],        // categoryIndex[], in the order actually solved
    justSolvedIndex: null, // categoryIndex of the group that should play its entrance animation on this render only
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
      const difficulty = PUZZLE_DATA.categories[categoryIndex].difficulty;
      flashCorrectTiles(difficulty, () => {
        state.solved.push(categoryIndex);
        state.tiles = state.tiles.filter((t) => t.categoryIndex !== categoryIndex);
        state.justSolvedIndex = categoryIndex;
        const won = state.solved.length === PUZZLE_DATA.categories.length;
        if (won) state.over = true;
        render();
        if (won) {
          triggerConfetti();
          showOverlay(true);
        }
      });
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

  function flashCorrectTiles(difficulty, callback) {
    document.querySelectorAll(".tile.selected").forEach((el) => {
      el.classList.add("correct-flash", difficulty);
    });
    setTimeout(callback, CORRECT_FLASH_MS);
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

  function triggerConfetti() {
    if (typeof document.body === "undefined" || !document.body) return;
    const colors = ["#f9df6d", "#a0c35a", "#b0c4ef", "#ba81c5", "#ff8a65"];
    const container = document.createElement("div");
    container.className = "confetti-container";
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = (Math.random() * 100) + "vw";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.4) + "s";
      piece.style.animationDuration = (2 + Math.random() * 1.5) + "s";
      container.appendChild(piece);
    }
    document.body.appendChild(container);
    setTimeout(() => {
      if (container.remove) container.remove();
    }, 4000);
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
    // Completion order, not difficulty order -- the order the player
    // actually solved them in, which is the order state.solved was built.
    state.solved.forEach((ci) => {
      const cat = PUZZLE_DATA.categories[ci];
      const div = document.createElement("div");
      div.className = `solved-group ${cat.difficulty}`;
      if (ci === state.justSolvedIndex) {
        div.classList.add("entering");
      }
      div.innerHTML = `<span class="cat-name">${cat.name}</span>${cat.words.join("、")}`;
      container.appendChild(div);
    });
    state.justSolvedIndex = null; // consume the flag so it doesn't replay on later, unrelated renders
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
    if (state.over) {
      submitBtn.style.display = "none";
    } else {
      submitBtn.style.display = "";
      submitBtn.disabled = selectedTiles().length !== 4;
    }
  }

  function buildSourcesHtml() {
    const withSources = PUZZLE_DATA.categories.filter((c) => c.source && c.source.url);
    if (withSources.length === 0) return "";
    const items = withSources
      .map((c) => `<li><span class="source-cat">${c.name}</span>：<a href="${c.source.url}" target="_blank" rel="noopener">${c.source.title || "阅读原文"}</a></li>`)
      .join("");
    return `
      <div class="sources">
        <p class="sources-title">想读更多今天的新闻？</p>
        <ul>${items}</ul>
      </div>
    `;
  }

  function showOverlay(won) {
    const overlay = document.getElementById("overlay");
    overlay.classList.remove("hidden");
    if (won) {
      overlay.innerHTML = `
        <h2>🎉 全部找到了！</h2>
        <p>恭喜完成今天的词语连连看！明天再来挑战新的一期吧。</p>
        ${buildSourcesHtml()}
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
