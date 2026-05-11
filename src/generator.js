#!/usr/bin/env node
/**
 * generator.js
 * Static site generator for CloverArchive
 * MVP version - no external dependencies
 */

const fs = require('fs').promises;
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ─── HTML Templates ─────────────────────────────────────────────────────────

const BASE_CSS = `
:root {
  --bg: #0d0d0d;
  --bg2: #141414;
  --bg3: #1a1a1a;
  --border: #2a2a2a;
  --text: #e0e0e0;
  --text-dim: #888;
  --accent: #c9a96e;
  --accent2: #a07850;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, 'PingFang SC', 'Microsoft JhengHei', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.7;
  min-height: 100vh;
}
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent2); }
.container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  padding: 20px 0;
}
header .container { display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.4rem; font-weight: 700; color: var(--accent); }
.logo span { color: var(--text-dim); font-weight: 400; font-size: 0.9rem; margin-left: 8px; }
nav a { margin-left: 20px; color: var(--text-dim); font-size: 0.9rem; }
nav a:hover { color: var(--accent); }
main { padding: 40px 0; }
h1 { font-size: 1.8rem; margin-bottom: 8px; color: var(--text); }
h2 { font-size: 1.3rem; color: var(--accent); margin: 30px 0 12px; }
h3 { font-size: 1.1rem; margin: 20px 0 10px; }
p { margin-bottom: 12px; color: var(--text-dim); }
.meta { font-size: 0.85rem; color: var(--text-dim); }
.law-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 30px; }
.law-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  transition: border-color 0.2s;
}
.law-card:hover { border-color: var(--accent); }
.law-card h3 { color: var(--accent); font-size: 1rem; margin: 0 0 8px; }
.law-card p { font-size: 0.85rem; margin: 0; }
.law-card .count { font-size: 0.8rem; color: var(--text-dim); margin-top: 8px; }
.article-list { margin-top: 30px; }
.article-item {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 12px;
}
.article-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.article-num { font-weight: 700; color: var(--accent); font-size: 1.1rem; }
.article-meta { font-size: 0.8rem; color: var(--text-dim); }
.article-text { font-size: 0.95rem; line-height: 1.8; color: var(--text); white-space: pre-wrap; }
.section-box {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}
.section-title { font-size: 1rem; color: var(--accent2); margin-bottom: 12px; font-weight: 600; }
.breadcrumb { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 20px; }
.breadcrumb a { color: var(--text-dim); }
.breadcrumb a:hover { color: var(--accent); }
footer {
  text-align: center;
  padding: 30px 0;
  color: var(--text-dim);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
  margin-top: 60px;
}
.btn { display: inline-block; padding: 8px 16px; background: var(--accent); color: #000; border-radius: 6px; font-size: 0.9rem; }
.btn:hover { background: var(--accent2); color: #fff; }
.search-box { margin: 20px 0; }
.search-box input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
}
.search-box input:focus { outline: none; border-color: var(--accent); }
`;

function baseHTML({ title, body }) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - CloverArchive</title>
  <meta name="description" content="台灣法律知識基礎設施 — 繁體中文法條查詢">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☘️</text></svg>">
  <style>${BASE_CSS}</style>
</head>
<body>
  <header>
    <div class="container">
      <div class="logo">☘️ CloverArchive<span>台灣法律知識庫</span></div>
      <nav>
        <a href="/">首頁</a>
        <a href="/category/civil.html">民事法</a>
        <a href="/category/criminal.html">刑事法</a>
        <a href="/category/administrative.html">行政法</a>
      </nav>
    </div>
  </header>
  <main class="container">
    ${body}
  </main>
  <footer>
    <div class="container">
      <p>☘️ CloverArchive · 台灣法律知識庫 · 資料來源：<a href="https://github.com/Dusty-K/LexKo-Codex" target="_blank">LexKo-Codex</a> (MIT License)</p>
    </div>
  </footer>
</body>
</html>`;
}

function indexHTML(laws) {
  const lawCards = laws.map(l => `
  <a href="/law/${l.lawCode}.html" class="law-card">
    <h3>${l.lawName || l.lawCode}</h3>
    <p>${l.category}</p>
    <div class="count">${l.count} 條法條</div>
  </a>`).join('\n');

  const body = `
    <h1>☘️ 台灣法律知識庫</h1>
    <p>繁體中文法條快速查詢 — 資料來源：LexKo-Codex</p>
    <div class="search-box">
      <input type="text" id="search" placeholder="搜尋法條..." oninput="filterCards(this.value)">
    </div>
    <div class="law-grid" id="lawGrid">
      ${lawCards}
    </div>
    <script>
    function filterCards(q) {
      const cards = document.querySelectorAll('.law-card');
      cards.forEach(c => {
        c.style.display = c.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
      });
    }
    </script>`;

  return baseHTML({ title: '首頁', body });
}

function lawPageHTML(law) {
  const articles = law.articles.map(a => `
    <div class="article-item">
      <div class="article-header">
        <span class="article-num">第 ${a.articleNum} 條</span>
        <span class="article-meta">${a.category}</span>
      </div>
      <div class="article-text">${escapeHtml(a.articleText)}</div>
      <div class="section-box">
        <div class="section-title">💬 白話解釋</div>
        <p style="color: var(--text-dim); font-style: italic;">（白話解釋準備中...）</p>
      </div>
    </div>`).join('\n');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LegalCode',
    name: law.lawName,
    jurisdiction: 'Taiwan',
    description: `${law.lawName} 共 ${law.articles.length} 條`
  });

  const body = `
    <div class="breadcrumb">
      <a href="/">首頁</a> &gt; ${law.lawName}
    </div>
    <h1>${law.lawName}</h1>
    <p class="meta">${law.category} · 共 ${law.articles.length} 條法條</p>
    <div class="article-list">
      ${articles}
    </div>
    <script type="application/ld+json">${schema}</script>`;

  return baseHTML({ title: law.lawName, body });
}

function categoryPageHTML(category, laws) {
  const lawCards = laws.map(l => `
  <a href="/law/${l.lawCode}.html" class="law-card">
    <h3>${l.lawName || l.lawCode}</h3>
    <p>${l.category}</p>
    <div class="count">${l.count} 條法條</div>
  </a>`).join('\n');

  const body = `
    <div class="breadcrumb">
      <a href="/">首頁</a> &gt; ${category}
    </div>
    <h1>${category}</h1>
    <p>共 ${laws.length} 部法規</p>
    <div class="law-grid">
      ${lawCards}
    </div>`;

  return baseHTML({ title: category, body });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[${timestamp()}] Starting static site generation`);

  // Load articles
  let articles;
  try {
    const data = await fs.readFile(ARTICLES_FILE, 'utf-8');
    articles = JSON.parse(data);
  } catch (e) {
    console.error(`[${timestamp()}] Cannot load articles: ${e.message}`);
    console.error(`[${timestamp()}] Run fetch-laws.js and parse-laws.js first`);
    process.exit(1);
  }

  console.log(`[${timestamp()}] Loaded ${articles.length} articles`);

  // Group by lawCode
  const byLaw = {};
  for (const a of articles) {
    if (!byLaw[a.lawCode]) byLaw[a.lawCode] = [];
    byLaw[a.lawCode].push(a);
  }

  // Build law summaries
  const laws = Object.entries(byLaw).map(([code, arts]) => ({
    lawCode: code,
    lawName: arts[0].lawName || code,
    category: arts[0].category || '一般法',
    count: arts.length,
    articles: arts
  }));

  // Sort laws alphabetically
  laws.sort((a, b) => a.lawName.localeCompare(b.lawName, 'zh-Hant'));

  // Ensure output dirs
  await fs.mkdir(path.join(OUTPUT_DIR, 'law'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'category'), { recursive: true });

  // Generate index
  await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), indexHTML(laws), 'utf-8');
  console.log(`[${timestamp()}] Generated index.html`);

  // Generate law pages
  for (const law of laws) {
    const html = lawPageHTML(law);
    await fs.writeFile(path.join(OUTPUT_DIR, 'law', `${law.lawCode}.html`), html, 'utf-8');
  }
  console.log(`[${timestamp()}] Generated ${laws.length} law pages`);

  // Generate category pages
  const categories = [...new Set(laws.map(l => l.category))];
  for (const cat of categories) {
    const catLaws = laws.filter(l => l.category === cat);
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'category', `${cat}.html`),
      categoryPageHTML(cat, catLaws),
      'utf-8'
    );
  }
  console.log(`[${timestamp()}] Generated ${categories.length} category pages`);

  console.log(`\n[${timestamp()}] Build complete! Output: ${OUTPUT_DIR}`);
}

main().catch(e => {
  console.error(`[${timestamp()}] Fatal: ${e.message}`);
  process.exit(1);
});