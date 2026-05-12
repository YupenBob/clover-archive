#!/usr/bin/env node
/**
 * generator.js
 * Static site generator for CloverArchive
 * MVP version - no external dependencies
 */

const fs = require('fs').promises;
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles-merged.json');
const EXPLANATIONS_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles-with-explanations.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// ─── HTML Templates ─────────────────────────────────────────────────────────

const BASE_CSS = `
:root {
  --bg: #f8f5f0;
  --bg2: #ede8df;
  --bg3: #e8f0e8;
  --border: #d4cfc5;
  --text: #2c2416;
  --text-dim: #6b5d4d;
  --accent: #c9a96e;
  --accent2: #a08050;
  --header-bg: #1a3328;
  --explanation-bg: #e8f0e8;
  --explanation-border: #8cb89c;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: -apple-system, 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.8;
  min-height: 100vh;
}
a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent2); }
.container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
header {
  background: var(--header-bg);
  border-bottom: 3px solid var(--accent);
  padding: 20px 0;
}
header .container { display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.3rem; font-weight: 700; color: #ffffff; letter-spacing: 0.02em; }
.logo span { color: rgba(255,255,255,0.7); font-weight: 400; font-size: 0.85rem; margin-left: 8px; }
nav a { margin-left: 24px; color: rgba(255,255,255,0.75); font-size: 0.9rem; }
nav a:hover { color: var(--accent); }
main { padding: 48px 0; }
h1 { font-size: 2rem; margin-bottom: 12px; color: var(--text); font-weight: 700; }
h2 { font-size: 1.4rem; color: var(--text); margin: 40px 0 16px; border-left: 4px solid var(--accent); padding-left: 12px; }
h3 { font-size: 1.15rem; color: var(--text); margin: 24px 0 12px; }
p { margin-bottom: 14px; color: var(--text-dim); }
.meta { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 8px; }
.tagline { font-size: 1.05rem; color: var(--text-dim); margin-bottom: 32px; font-style: italic; }
.law-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 32px; }
.law-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-left: 4px solid var(--header-bg);
  border-radius: 8px;
  padding: 20px 24px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: block;
}
.law-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: var(--accent); }
.law-card h3 { color: var(--header-bg); font-size: 1.1rem; margin: 0 0 8px; font-weight: 700; }
.law-card p { font-size: 0.85rem; color: var(--text-dim); margin: 0; }
.law-card .count { font-size: 0.8rem; color: var(--accent2); margin-top: 10px; font-weight: 600; }
.article-list { margin-top: 32px; }
.article-item {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px 28px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.article-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed var(--border); }
.article-num { font-weight: 700; color: var(--accent2); font-size: 1.15rem; font-family: Georgia, serif; }
.article-meta { font-size: 0.82rem; color: var(--text-dim); }
.article-text { font-size: 0.95rem; line-height: 1.9; color: var(--text); white-space: pre-wrap; }
.section-title { font-size: 0.95rem; color: var(--header-bg); margin-bottom: 10px; font-weight: 700; }
.explanation-box {
  background: var(--explanation-bg);
  border: 1px solid var(--explanation-border);
  border-left: 4px solid var(--header-bg);
  border-radius: 8px;
  padding: 18px 22px;
  margin-top: 16px;
}
.explanation-box .section-title { color: var(--header-bg); font-size: 0.9rem; margin-bottom: 12px; font-weight: 700; }
.explanation-content { color: var(--text); font-size: 0.9rem; line-height: 1.75; }
.breadcrumb { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 24px; }
.breadcrumb a { color: var(--text-dim); }
.breadcrumb a:hover { color: var(--accent); }
footer {
  text-align: center;
  padding: 40px 0;
  color: var(--text-dim);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
  margin-top: 60px;
}
.btn { display: inline-block; padding: 8px 16px; background: var(--accent); color: #fff; border-radius: 6px; font-size: 0.9rem; }
.btn:hover { background: var(--accent2); }
.search-box { margin: 24px 0 20px; }
.search-box input {
  width: 100%;
  padding: 14px 18px;
  background: #ffffff;
  border: 2px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 1rem;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
}
.search-box input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(201,169,110,0.15); }
`;

function baseHTML({ title, body }) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - CloverArchive</title>
  <meta name="description" content="台灣法律知識基礎設施 — 幫助普通人讀懂繁體中文法條">
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
        <a href="/category/labor.html">勞動法</a>
      </nav>
    </div>
  </header>
  <main class="container">
    ${body}
  </main>
  <footer>
    <div class="container">
      <p>☘️ CloverArchive 法律知識庫 · 用❤建造 by Clover · 資料來源：<a href="https://github.com/Dusty-K/LexKo-Codex" target="_blank">LexKo-Codex</a> (MIT License)</p>
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
    <p class="tagline">幫助普通人讀懂繁體中文法律</p>
    <p>從公司法到勞動基準法，從憲法到民法——幫你把法律翻譯成白話。</p>
    <div class="search-box">
      <input type="text" id="search" placeholder="搜尋法規..." oninput="filterCards(this.value)">
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
  const articles = law.articles.map(a => {
    const articleText = a.ragContent || a.articleText;
    return `
    <div class="article-item">
      <div class="article-header">
        <span class="article-num">第 ${a.articleNum} 條</span>
        <span class="article-meta">${a.category || ''}${a.chapter ? ' · ' + a.chapter.trim() : ''}</span>
      </div>
      <div class="article-text">${escapeHtml(articleText)}</div>
      ${a.explanation ? `<div class="explanation-box">
        <div class="section-title">☘️ Clover 白話解釋</div>
        <div class="explanation-content">${a.explanation.replace(/\n/g, '<br>')}</div>
      </div>` : ''}
    </div>`;
  }).join('\n');

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
    <div class="search-box">
      <input type="text" id="articleSearch" placeholder="搜尋法條內容..." oninput="filterArticles(this.value)">
    </div>
    <div class="article-list" id="articleList">
      ${articles}
    </div>
    <script>
    function filterArticles(q) {
      const items = document.querySelectorAll('.article-item');
      items.forEach(it => {
        const text = it.querySelector('.article-text').textContent.toLowerCase();
        const num = it.querySelector('.article-num').textContent.toLowerCase();
        it.style.display = (text.includes(q.toLowerCase()) || num.includes(q.toLowerCase())) ? '' : 'none';
      });
    }
    </script>
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

  // Load explanations if available
  let explanationMap = {};
  try {
    const explData = await fs.readFile(EXPLANATIONS_FILE, 'utf-8');
    const explArticles = JSON.parse(explData);
    for (const a of explArticles) {
      if (a.explanation && a.explanation.trim() && !a.explanation.startsWith('【注】解釋生成失敗')) {
        explanationMap[`${a.lawCode}-${a.articleNum}`] = a.explanation;
      }
    }
    console.log(`[${timestamp()}] Loaded ${Object.keys(explanationMap).length} explanations`);
  } catch(e) {
    console.log(`[${timestamp()}] No explanations file, skipping`);
  }

  // Group by lawCode
  const byLaw = {};
  for (const a of articles) {
    const key = `${a.lawCode}-${a.articleNum}`;
    if (explanationMap[key]) a.explanation = explanationMap[key];
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