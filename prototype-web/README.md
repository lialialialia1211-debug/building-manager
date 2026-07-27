# 《鎖門之後》辦公室漫畫編排器

這是 React／TypeScript 製作的單篇成人辦公室漫畫編排器。玩家把 13 張牌中的
8 張放進六格漫畫，程式判定完美線或 20 條有方向性的雙人支線，再依序揭露
中間格、第六格與結局漫畫。

## 開發指令

```powershell
npm install
npm run dev
npm run check
npm run build:pages
```

`npm run check` 會依序驗證內容、美術規格、單元測試、正式建置與三種目標尺寸的
Playwright 測試。正式人工 QA 必須使用 GitHub 預覽，不使用本機網址。

## 新版內容位置

- 劇本：`../content/office-comic/office-episode.json`
- 美術機器規格：`../content/office-comic/office-asset-plan.json`
- 美術接入：`../content/office-comic/assets/office-comic/{asset_id}.png`
- 人類可讀美術工單：`../docs/art/2026-07-27-office-comic-production-package/`

美術缺件時，程式會顯示維持正確比例與 asset ID 的占位框；把對應 PNG 放進
上述接入目錄後，不需要修改程式碼。舊房間、相簿與建築管理內容仍保留在儲存庫
供追溯，但不會被複製進新版正式建置。
