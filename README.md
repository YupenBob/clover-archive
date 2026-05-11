# ☘️ CloverArchive

> 台灣法律知識基礎設施 — 繁體中文法條快速查詢

## 簡介

CloverArchive 是一個靜態網站，展示台灣法律條文。所有法條資料來自 [LexKo-Codex](https://github.com/Dusty-K/LexKo-Codex) 專案（MIT License）。

## 資料來源

- **LexKo-Codex** by [Dusty-K](https://github.com/Dusty-K/LexKo-Codex) — MIT License
- 包含台灣主要法規的繁體中文條文

## 技術架構

- 純 Node.js，無外部依賴
- 靜態 HTML 生成
- 深色主題，響應式設計

## 快速開始

```bash
# 安裝依賴（可選，MVP 不需要）
npm install

# 下載法條資料
node scripts/fetch-laws.js

# 解析為標準格式
node scripts/parse-laws.js

# 生成靜態網站
node src/generator.js

# 本地預覽
npx serve public
```

## 專案結構

```
clover-archive/
├── data/
│   ├── raw/           # 原始 JSON（從 GitHub 抓取）
│   └── processed/    # 解析後的法條陣列
├── scripts/
│   ├── fetch-laws.js # 從 GitHub 下載原始資料
│   └── parse-laws.js # 解析為標準格式
├── src/
│   └── generator.js  # 靜態網站生成器
└── public/           # 生成的靜態檔案
    ├── index.html
    ├── law/
    └── category/
```

## 部署

```bash
npx vercel --prod
```

## License

- 程式碼：MIT
- 法條資料：[LexKo-Codex MIT License](https://github.com/Dusty-K/LexKo-Codex/blob/main/LICENSE)