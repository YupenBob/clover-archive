const fs = require('fs').promises;
const path = require('path');

const ARTICLES_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles.json');
const RAG_FILE = path.join(__dirname, '..', 'data', 'raw', 'law-rag-chatbot.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles-merged.json');

async function main() {
    const lexiko = JSON.parse(await fs.readFile(ARTICLES_FILE, 'utf-8'));
    const ragRaw = JSON.parse(await fs.readFile(RAG_FILE, 'utf-8'));

    // Build RAG lookup: law_name -> article_number_normalized -> {content, chapter}
    const ragByLaw = {};
    for (const item of ragRaw) {
        const ln = item['law_name'];
        // Normalize article number: strip 第 and 條, normalize spaces
        const an = item['article_number'].replace(/第\s*/g, '').replace(/條/g, '').trim();
        ragByLaw[ln] = ragByLaw[ln] || {};
        ragByLaw[ln][an] = { content: item['content'], chapter: item['chapter'] };
    }

    console.log('RAG laws found:', Object.keys(ragByLaw).join(', '));

    // Law name to code mapping for laws in RAG that need to be matched against lexiko codes
    const lawNameToCode = {
        '公司法': 'J0080001',
        '勞動基準法': 'N0030001',
        '民法': 'B0000001',
        '勞工保險條例': null,
        '就業服務法': null,
        '性別平等工作法': null,
        '勞工退休金條例': null,
    };

    const merged = [];
    let enriched = 0;
    let enrichedByLaw = {};

    for (const art of lexiko) {
        const enrichedArt = { ...art };

        // Find RAG equivalent by law name
        const ragLawName = Object.keys(lawNameToCode).find(name => lawNameToCode[name] === art.lawCode);
        if (ragLawName && ragByLaw[ragLawName]) {
            // Normalize lexiko article number for lookup
            const lexArtNum = art.articleNum.replace(/^0+/, '').trim(); // "00001" -> "1"
            const ragArt = ragByLaw[ragLawName][lexArtNum];
            if (ragArt) {
                enrichedArt.ragContent = ragArt.content;
                enrichedArt.chapter = ragArt.chapter;
                enriched++;
                enrichedByLaw[ragLawName] = (enrichedByLaw[ragLawName] || 0) + 1;
            }
        }
        merged.push(enrichedArt);
    }

    // Add laws only in RAG (not matched to any lexiko lawCode)
    const lexikoCodes = new Set(lexiko.map(a => a.lawCode));
    let addedFromRag = 0;

    for (const [lawName, articles] of Object.entries(ragByLaw)) {
        const code = lawNameToCode[lawName] || lawName;
        // Skip laws we already enriched (already in lexiko)
        if (lexikoCodes.has(lawNameToCode[lawName] || code)) continue;

        for (const [artNum, data] of Object.entries(articles)) {
            merged.push({
                lawCode: code,
                lawName: lawName,
                articleNum: artNum.padStart(5, '0'),
                articleText: data.content,
                ragContent: data.content,
                chapter: data.chapter,
                source: 'rag'
            });
            addedFromRag++;
        }
    }

    console.log(`Merged: ${merged.length} total articles`);
    console.log(`Enriched from RAG: ${enriched} articles`);
    for (const [law, count] of Object.entries(enrichedByLaw)) {
        console.log(`  ${law}: ${count} articles enriched`);
    }
    console.log(`New from RAG (not in LexKo): ${addedFromRag} articles`);

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    console.log(`Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);