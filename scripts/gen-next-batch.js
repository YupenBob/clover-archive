#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

const MERGED = JSON.parse(fs.readFileSync('data/processed/articles-merged.json', 'utf8'));
const EXISTING = JSON.parse(fs.readFileSync('data/processed/articles-with-explanations.json', 'utf8'));
const OUTPUT = 'data/processed/articles-with-explanations.json';

const doneKeys = new Set(EXISTING.map(a => a.lawCode + '|' + a.articleNum));
const expMap = {};
for (const a of EXISTING) expMap[a.lawCode + '|' + a.articleNum] = a.explanation;

// Focus on N0030001 remaining 80 articles
const targets = MERGED.filter(a => {
    if (a.lawCode !== 'N0030001') return false;
    const key = a.lawCode + '|' + a.articleNum;
    if (doneKeys.has(key)) return false;
    const text = a.ragContent || a.articleText;
    if (!text || text.length < 30) return false;
    if (text.match(/^第.{1,10}章/)) return false;
    return true;
}).slice(0, 40); // limit to 40 at a time

console.log(`Generating explanations for ${targets.length} N0030001 articles...`);

function callMinimax(prompt) {
    const payload = { model: 'MiniMax-M2.7', max_tokens: 400, thinking: { enabled: false }, messages: [{ role: 'user', content: prompt }] };
    const tmp = '/tmp/clover_exp3.json';
    fs.writeFileSync(tmp, JSON.stringify(payload));
    const token = 'sk-cp-svSrZiXrNZULWAcOi6m6y9jU5rbk-Un4I-RmOtI8Xs4jCGKQr80NKwbGx9xoWP-9Cs6aDAutRQ8jbDNIbVXBl3vqxlf9qBDbETcqgtzZQjCOlN-P8KWHV_o';
    try {
        const out = execSync(`curl -s --max-time 30 -X POST "https://api.minimaxi.com/anthropic/v1/messages" -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" --data-binary @${tmp}`, { encoding: 'utf-8', timeout: 35000 });
        const resp = JSON.parse(out);
        return resp.content?.find?.(c => c.type === 'text')?.text || resp.content?.[0]?.text || '';
    } catch(e) { return null; }
}

let added = 0;
for (const article of targets) {
    const key = article.lawCode + '|' + article.articleNum;
    if (expMap[key]) { console.log(`  skip ${key}`); continue; }
    const text = article.ragContent || article.articleText;
    const prompt = `你是台灣法律白話翻譯專家。請把以下法條用國中生也看得懂的繁體中文解釋，分三部分：
1.【一句話概括】
2.【白話解釋】
3.【重點提示】

法條：第${article.articleNum}條
${text.slice(0, 250)}

嚴格按照格式回答。`;
    const explanation = callMinimax(prompt);
    if (explanation && explanation.length > 20) {
        expMap[key] = explanation;
        added++;
        console.log(`  ✅ N0030001 第${article.articleNum}條`);
    } else {
        console.log(`  ❌ N0030001 第${article.articleNum}條`);
    }
    fs.writeFileSync('/tmp/exp_map_backup.json', JSON.stringify(expMap));
    require('child_process').execSync('sleep 0.3');
}

// Save
const result = Object.entries(expMap).map(([key, explanation]) => {
    const [lawCode, articleNum] = key.split('|');
    const art = MERGED.find(a => a.lawCode === lawCode && a.articleNum === articleNum) || { lawCode, articleNum, articleText: '' };
    return { ...art, explanation };
});
fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\nDone! ${result.length} articles total, added ${added}`);
