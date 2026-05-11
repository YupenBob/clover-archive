#!/usr/bin/env node
/**
 * parse-laws.js
 * Parses raw JSON law files into a flat articles array
 */

const fs = require('fs').promises;
const path = require('path');

const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'processed', 'articles.json');

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function main() {
  console.log(`[${timestamp()}] Starting law data parsing`);

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });

  // Read all raw files
  let files;
  try {
    files = await fs.readdir(RAW_DIR);
  } catch (e) {
    console.error(`[${timestamp()}] Cannot read raw directory: ${e.message}`);
    process.exit(1);
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'));
  console.log(`[${timestamp()}] Found ${jsonFiles.length} raw files`);

  const allArticles = [];

  for (const file of jsonFiles) {
    process.stdout.write(`[${timestamp()}] Parsing ${file}... `);

    try {
      const content = await fs.readFile(path.join(RAW_DIR, file), 'utf-8');
      const data = JSON.parse(content);

      // Extract metadata
      const metadata = data._metadata || {};
      const lawCode = file.replace('.json', '');

      // Process all keys except _metadata
      for (const [key, value] of Object.entries(data)) {
        if (key === '_metadata') continue;

        // Key format: article number + underscore suffix
        // e.g. "00010_A_" or "001_"
        const parts = key.split('_');
        const articleNum = parts[0];

        allArticles.push({
          lawCode,
          articleNum,
          articleText: value,
          lawName: metadata.title || lawCode,
          category: metadata.category || '一般法'
        });
      }

      console.log(`OK (${Object.keys(data).length - 1} articles)`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  // Sort by lawCode then articleNum
  allArticles.sort((a, b) => {
    if (a.lawCode !== b.lawCode) return a.lawCode.localeCompare(b.lawCode);
    return a.articleNum.localeCompare(b.articleNum);
  });

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allArticles, null, 2), 'utf-8');

  console.log(`\n[${timestamp()}] Done! Total articles: ${allArticles.length}`);
  console.log(`[${timestamp()}] Output: ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error(`[${timestamp()}] Fatal: ${e.message}`);
  process.exit(1);
});