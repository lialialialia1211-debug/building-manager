# 《鎖門之後》辦公室漫畫編排器 — QA 紀錄

- 日期：2026-07-30（Asia/Taipei）
- 範圍：舊案退役後的單篇辦公室漫畫編排器完整重做
- 原始碼分支：`codex/office-comic-rebuild`
- 精確受測原始碼 commit：`2d1a92c5782da8fe15f0ab08666286d78d905604`
- GitHub Pages 部署 commit：`c785354de0ad97e7fa45641b8f4fd09d93dff575`
- Preview URL：<https://lialialialia1211-debug.github.io/building-manager/>

## 自動化閘門

在精確受測原始碼 commit 執行：

```powershell
npm --prefix prototype-web run check
```

| 步驟 | 結果 |
|---|---|
| `validate:content` | PASS — 13 張牌、20 條有方向支線 |
| `validate:assets` | PASS — 87 份 PNG 全數到齊，0 份待補 |
| `test` | PASS — 14 檔、95 個 Vitest 測試 |
| `build` | PASS — TypeScript 與 Vite 正式建置 |
| `test:e2e` | PASS — 18 個 Playwright 測試，涵蓋 1920×1080、1280×720、1280×800 |

## GitHub 預覽驗證

GitHub Pages build `1122356629` 已完成，狀態為 `built`。使用 headless Chromium
直接開啟上述公開網址並確認：

- 頁面與劇本 JSON 均回傳 HTTP 200。
- 網頁標題為「鎖門之後｜辦公室漫畫編排器」。
- 成人內容確認頁可見。
- 確認年齡後，辦公室漫畫六格編排器可見。
- 正式開場圖載入尺寸為 2560×1440，首屏沒有素材占位框。
- 87 張 `/assets/office-comic/*.png` 已隨部署發布；四張修正版素材抽查皆為 HTTP 200。
- 沒有非預期 HTTP 錯誤。

第一次預覽煙霧測試曾抓到劇本使用網站根路徑而在 GitHub Pages 子路徑 404。
已以回歸測試覆蓋並在 `2495e109` 修正，重新部署後以上項目全部通過。

## 人工 QA 狀態

公開預覽已符合人工 QA 前置條件，可以從 Preview URL 開始測試。87 份正式美術
已整合到 `content/office-comic/assets/office-comic/{asset_id}.png`，並以同一套
自動化閘門驗證完成。
