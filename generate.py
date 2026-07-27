"""Generates a dated puzzle page under puzzles/, plus refreshes index.html
(always the latest puzzle) and archive.html (links to every past puzzle).

Usage: python3 generate.py puzzle.json
where puzzle.json is {"date": "2026-07-27", "categories": [{"name": str,
"difficulty": "yellow"|"green"|"blue"|"purple", "words": [4 strings]}, x4]}
"""
import json
import os
import sys

REPO_DIR = os.path.dirname(os.path.abspath(__file__))
PUZZLES_DIR = os.path.join(REPO_DIR, "puzzles")

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>词语连连看 — {date}</title>
  <link rel="stylesheet" href="{css_path}">
</head>
<body>
  <div class="page">
    <header class="site-header">
      <h1>词语连连看</h1>
      <p class="date">{date}</p>
    </header>
    <p class="instructions">选择 4 个你认为相关的词语，然后点击「提交」。</p>
    <div class="mistakes-wrap">
      <div class="mistakes">剩余机会：<span id="mistake-count">4</span> 次 <span class="dots" id="mistake-dots"></span></div>
      <div id="flash-message" class="flash-overlay"></div>
    </div>
    <div class="solved-groups" id="solved-groups"></div>
    <div class="grid" id="grid"></div>
    <div class="controls">
      <button class="primary" id="submit-btn" disabled>提交</button>
    </div>
    <div class="overlay hidden" id="overlay"></div>
    <footer class="site-footer">
      <a href="{archive_path}">往期回顾</a> &middot; <a href="{index_path}">今日题目</a>
    </footer>
  </div>
  <script>
    const PUZZLE_DATA = {puzzle_json};
  </script>
  <script src="{js_path}"></script>
</body>
</html>
"""

ARCHIVE_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>词语连连看 — 往期回顾</title>
  <link rel="stylesheet" href="assets/game.css">
</head>
<body>
  <div class="page">
    <header class="site-header">
      <h1>往期回顾</h1>
    </header>
    <ul style="list-style:none; padding:0; font-size:20px; line-height:2.2; text-align:center;">
{entries}
    </ul>
    <footer class="site-footer">
      <a href="index.html">今日题目</a>
    </footer>
  </div>
</body>
</html>
"""


def list_puzzle_dates():
    if not os.path.isdir(PUZZLES_DIR):
        return []
    dates = [f[:-5] for f in os.listdir(PUZZLES_DIR) if f.endswith(".html")]
    return sorted(dates, reverse=True)


def build_page(puzzle, css_path, js_path, archive_path, index_path):
    return PAGE_TEMPLATE.format(
        date=puzzle["date"],
        css_path=css_path,
        js_path=js_path,
        archive_path=archive_path,
        index_path=index_path,
        puzzle_json=json.dumps(puzzle, ensure_ascii=False),
    )


def build_archive():
    dates = list_puzzle_dates()
    entries = "\n".join(
        f'      <li><a href="puzzles/{d}.html">{d}</a></li>' for d in dates
    )
    return ARCHIVE_TEMPLATE.format(entries=entries)


def generate(puzzle):
    os.makedirs(PUZZLES_DIR, exist_ok=True)

    dated_page = build_page(puzzle, "../assets/game.css", "../assets/game.js", "../archive.html", "../index.html")
    dated_path = os.path.join(PUZZLES_DIR, f"{puzzle['date']}.html")
    with open(dated_path, "w", encoding="utf-8") as f:
        f.write(dated_page)

    index_page = build_page(puzzle, "assets/game.css", "assets/game.js", "archive.html", "index.html")
    with open(os.path.join(REPO_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_page)

    with open(os.path.join(REPO_DIR, "archive.html"), "w", encoding="utf-8") as f:
        f.write(build_archive())

    return dated_path


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as f:
        puzzle = json.load(f)
    path = generate(puzzle)
    print(f"Wrote {path}, index.html, archive.html")
