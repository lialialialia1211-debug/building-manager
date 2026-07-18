# Web 可玩原型

此目錄是《大樓管理員》的 React／TypeScript 可玩原型。內容、資產清單與 runtime 資產皆從相鄰的 `content/` 目錄讀取；原型以 `content/asset-manifest.json` 與 `content/adult-asset-manifest.json` 為唯一資產契約。

## 本機開發與自動驗證

需求為 Node.js 24.14.x。以下命令只供開發診斷與自動化驗證使用：

```powershell
npm --prefix prototype-web install
npm --prefix prototype-web run dev
npm --prefix prototype-web run check
```

`check` 會執行內容與資產驗證、Vitest、production build 及三個 Playwright viewport。`build:pages` 以 `/building-manager/` base path 產生 GitHub Pages 靜態產物：

```powershell
npm --prefix prototype-web run build:pages
```

本機 `localhost`、本機 production build 與 `file://` 都不可作為人工 QA 環境；它們僅用於開發者診斷和自動測試。

## GitHub Pages 與人工 QA

`.github/workflows/deploy-pages.yml` 只在 `main` push 或人工 `workflow_dispatch` 執行。它會先安裝相依套件、完成 `check`，再執行 `build:pages` 並部署 `prototype-web/dist`。

人工 QA 必須使用已成功部署、且已用瀏覽器開啟的 GitHub Pages URL。先將通過 `check` 的精確遊戲提交、workflow run URL、Pages URL 與開啟結果記錄到 `docs/qa/2026-07-18-playable-art-integration.md`，才能開始人工 QA；未有該線上證據時，人工 QA 維持 blocked，不能改用 localhost。

## 目前交付範圍

- `playable` manifest 使用可遊玩的 placeholder 素材；`formal` 是正式發行的品質 gate，不代表目前素材已完成正式交付。
- 成熟內容預設關閉。此切換保證應用程式不載入或顯示成人資產；GitHub Pages 的靜態 URL 不提供存取控制。
- 結局使用可重播的 12 秒 recap；這是 runtime 展示，不是正式影片交付。
- Godot migration 與正式發行仍受驗收與正式素材缺口限制。
