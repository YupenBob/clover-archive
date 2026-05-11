#!/usr/bin/env node
/**
 * fetch-laws.js
 * Fetches all law JSON files from Dusty-K/LexKo-Codex GitHub repository
 */

const fs = require('fs').promises;
const path = require('path');

const REPO = 'Dusty-K/LexKo-Codex';
const API_BASE = `https://api.github.com/repos/${REPO}/contents`;
const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function fetchJsonWithRetry(url, retries = 3, delayMs = 2000) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CloverArchive-Fetcher/1.0'
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    if (res.status === 403 && attempt < retries) {
      console.log(`  Rate limited, waiting ${delayMs * attempt}ms...`);
      await new Promise(r => setTimeout(r, delayMs * attempt));
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

async function main() {
  console.log(`[${timestamp()}] Starting law data fetch from ${REPO}`);

  // Ensure raw directory exists
  await fs.mkdir(RAW_DIR, { recursive: true });

  // Fetch directory listing
  console.log(`[${timestamp()}] Fetching file list from ${API_BASE}/law_data...`);
  let files;
  try {
    files = await fetchJsonWithRetry(`${API_BASE}/law_data`);
  } catch (e) {
    console.error(`[${timestamp()}] Failed to fetch directory: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(files)) {
    console.error(`[${timestamp()}] Unexpected response format`);
    process.exit(1);
  }

  console.log(`[${timestamp()}] Found ${files.length} files`);

  let success = 0;
  let failed = 0;

  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;

    process.stdout.write(`[${timestamp()}] Fetching ${file.name}... `);

    try {
      // Get full file details (includes base64 content) with retry
      const fileData = await fetchJsonWithRetry(file.url);

      if (!fileData.content) {
        console.log(`SKIP (no content)`);
        failed++;
        continue;
      }

      // Base64 decode
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

      // Validate JSON
      JSON.parse(content);

      // Save
      const outPath = path.join(RAW_DIR, file.name);
      await fs.writeFile(outPath, content, 'utf-8');

      console.log(`OK (${content.length} bytes)`);
      success++;

      // Delay between requests to avoid rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n[${timestamp()}] Done! success=${success} failed=${failed}`);
}

main().catch(e => {
  console.error(`[${timestamp()}] Fatal: ${e.message}`);
  process.exit(1);
});