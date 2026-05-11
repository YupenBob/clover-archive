const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARTICLES_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles-with-explanations.json');
const PROGRESS_FILE = path.join(__dirname, '..', 'data', 'processed', 'explain-progress.json');

const API_TOKEN = 'sk-cp-svSrZiXrNZULWAcOi6m6y9jU5rbk-Un4I-RmOtI8Xs4jCGKQr80NKwbGx9xoWP-9Cs6aDAutRQ8jbDNIbVXBl3vqxlf9qBDbETcqgtzZQjCOlN-P8KWHV_o';

function callMinimax(prompt, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const payload = {
            model: 'MiniMax-M2.7',
            max_tokens: 600,
            thinking: { enabled: false },
            messages: [{ role: 'user', content: prompt }]
        };
        const tmpFile = '/tmp/clover_explain_payload.json';
        fs.writeFileSync(tmpFile, JSON.stringify(payload));
        const cmd = `curl -s --max-time 30 -X POST "https://api.minimaxi.com/anthropic/v1/messages" -H "Content-Type: application/json" -H "Authorization: Bearer ${API_TOKEN}" --data-binary @${tmpFile}`;
        try {
            const out = execSync(cmd, { encoding: 'utf-8', timeout: 35000 });
            const resp = JSON.parse(out);
            // Extract text from text block (not thinking block)
            const textBlock = resp.content?.find(c => c.type === 'text');
            const text = textBlock?.text || '';
            if (text.trim()) return text;
            if (attempt < retries) {
                console.log(`    [retry ${attempt + 1}] empty response, retrying...`);
                execSync('sleep 2');
                continue;
            }
            return `【注】解釋生成失敗：空回應`;
        } catch(e) {
            if (attempt < retries) {
                console.log(`    [retry ${attempt + 1}] error: ${e.message.substring(0, 50)}, retrying...`);
                execSync('sleep 2');
                continue;
            }
            return `【注】解釋生成失敗：${e.message.substring(0, 100)}`;
        }
    }
}

function hasExplanation(article) {
    return article.explanation && article.explanation.trim() && !article.explanation.includes('解釋生成失敗');
}

async function main() {
    console.log('Loading articles...');
    const allArticles = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
    
    const focusLaws = ['J0080001', 'N0030001'];
    const targetArticles = allArticles.filter(a => focusLaws.includes(a.lawCode) && parseInt(a.articleNum, 10) <= 150);
    
    let outputArticles = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        outputArticles = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
        console.log(`Loaded existing output: ${outputArticles.length} articles`);
    }
    
    let completedKeys = new Set();
    if (fs.existsSync(PROGRESS_FILE)) {
        const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        completedKeys = new Set(progress.done || []);
        for (const a of outputArticles) {
            if (hasExplanation(a)) completedKeys.add(`${a.lawCode}-${a.articleNum}`);
        }
    }
    console.log(`Already completed: ${completedKeys.size}`);
    console.log(`Target: ${targetArticles.length} articles (公司法 + 勞基法, first 15 each)`);
    
    for (const article of targetArticles) {
        const key = `${article.lawCode}-${article.articleNum}`;
        if (completedKeys.has(key)) {
            console.log(`  [SKIP] ${key}`);
            continue;
        }
        
        const artNum = parseInt(article.articleNum, 10);
        const prompt = `你是一位台灣法律白話翻譯專家。請把以下法條用「國中生也看得懂的繁體中文」解釋，分三部分：
1. 「一句話概括」：一句話說清楚這條在講什麼
2. 「白話解釋」：2-3句詳細說明，用生活例子
3. 「重點提示」：一般人最常遇到的問題或需要注意的事

法條：第${artNum}條
${article.articleText}

請用繁體中文回答，格式：

【一句話概括】
...

【白話解釋】
...

【重點提示】
...`;

        const explanation = callMinimax(prompt);
        article.explanation = explanation;
        
        const idx = outputArticles.findIndex(a => a.lawCode === article.lawCode && a.articleNum === article.articleNum);
        if (idx >= 0) outputArticles[idx] = article;
        else outputArticles.push(article);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputArticles, null, 2), 'utf-8');
        
        if (hasExplanation(article)) {
            completedKeys.add(key);
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ done: [...completedKeys] }));
        }
        
        const status = explanation.includes('解釋生成失敗') ? '❌' : '✅';
        console.log(`  [${article.lawCode}] 第${artNum}條 ${status} (${completedKeys.size}/${targetArticles.length})`);
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    const successCount = outputArticles.filter(hasExplanation).length;
    console.log(`\nDone! Valid: ${successCount}/${targetArticles.length}`);
}

main().catch(console.error);