# 《鎖門之後》辦公室漫畫編排器 — QA 紀錄

- 日期：2026-07-28（Asia/Taipei）
- 範圍：舊案退役後的單篇辦公室漫畫編排器完整重做
- 原始碼分支：`codex/office-comic-rebuild`
- 精確受測原始碼 commit：`2495e1091f9fca0580ca478241b9c26c5ae7c6aa`
- GitHub Pages 部署 commit：`b7a9fca7ef9c15ab910792a4bba0b0d513010f8c`
- Preview URL：<https://lialialialia1211-debug.github.io/building-manager/>

## 自動化閘門

在精確受測原始碼 commit 執行：

```powershell
npm --prefix prototype-web run check
```

| 步驟 | 結果 |
|---|---|
| `validate:content` | PASS — 13 張牌、20 條有方向支線 |
| `validate:assets` | PASS — 87 份規格有效；87 份 PNG 尚待美術 |
| `test` | PASS — 14 檔、94 個 Vitest 測試 |
| `build` | PASS — TypeScript 與 Vite 正式建置 |
| `test:e2e` | PASS — 18 個 Playwright 測試，涵蓋 1920×1080、1280×720、1280×800 |

## GitHub 預覽驗證

GitHub Pages build `1117794718` 已完成，狀態為 `built`。使用 headless Chromium
直接開啟上述公開網址並確認：

- 頁面與劇本 JSON 均回傳 HTTP 200。
- 網頁標題為「鎖門之後｜辦公室漫畫編排器」。
- 成人內容確認頁可見。
- 確認年齡後，辦公室漫畫六格編排器可見。
- 除計畫中尚未交付的 `/assets/office-comic/*.png` 外，沒有非預期 HTTP 錯誤。

第一次預覽煙霧測試曾抓到劇本使用網站根路徑而在 GitHub Pages 子路徑 404。
已以回歸測試覆蓋並在 `2495e109` 修正，重新部署後以上項目全部通過。

## 人工 QA 狀態

公開預覽已符合人工 QA 前置條件，可以從 Preview URL 開始測試。由於 87 份正式
美術尚未回交，現階段會顯示固定比例、附 asset ID 的預期占位框；這不視為程式
缺陷。美術完成後放入
`content/office-comic/assets/office-comic/{asset_id}.png`，再重跑同一套閘門。
