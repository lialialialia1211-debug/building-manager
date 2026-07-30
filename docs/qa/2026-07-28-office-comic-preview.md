# 《鎖門之後》辦公室漫畫編排器 — QA 紀錄

- 日期：2026-07-31（Asia/Taipei）
- 範圍：四格自由編排、主線提示、穩定支線判定與自動 CG 揭露
- 原始碼分支：`codex/office-comic-rebuild`
- 精確受測原始碼 commit：`5205c7f221eb4a16243dbf37c237a3fa768d09d8`
- GitHub Pages 部署 commit：`d5486f27550aa803056911d6ae55476ddc5a98d8`
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
| `test` | PASS — 14 檔、107 個 Vitest 測試 |
| `build` | PASS — TypeScript 與 Vite 正式建置 |
| `test:e2e` | PASS — 24 個 Playwright 測試，涵蓋 1920×1080、1280×720、1280×800 |

## GitHub 預覽驗證

GitHub Pages build `1123734351` 已完成，狀態為 `built`，且對應部署 commit
`d5486f27550aa803056911d6ae55476ddc5a98d8`。直接開啟上述公開網址並確認：

- 頁面與劇本 JSON 均回傳 HTTP 200。
- 網頁標題為「鎖門之後｜辦公室漫畫編排器」。
- 玩家編排區固定四格，顯示 `0 / 4 張卡`。
- 第一格顯示「主線似乎需要兩名人物」，第三格顯示「再放入一個場景與一件關鍵物品」。
- 以「併購合約 → 長離 → 老闆私人辦公室 → 男漂泊者」的非標準順序編排，仍命中「完美結局：鎖門之後」。
- 按一次「演下去」後四格依序自動揭露，路線 CG 自動出現，不需要重複點擊。
- 「閱讀後續」可進入 12 格完美結局，第一頁四張正式結局圖皆可見。
- 瀏覽器主控台錯誤數為 0。
- 正式開場圖載入尺寸為 2560×1440，首屏沒有素材占位框。
- 87 張 `/assets/office-comic/*.png` 已隨部署發布；四張修正版素材抽查皆為 HTTP 200。
- 沒有非預期 HTTP 錯誤。

自動化另驗證主線四張卡的 24 種排列、20 條有方向支線、三／四人物取最前兩名
決定支線、零／一人物停留編排器，以及舊八格存檔遷移後保留年齡確認與解鎖紀錄。

## 人工 QA 狀態

公開預覽已符合人工 QA 前置條件，可以從 Preview URL 開始測試。87 份正式美術
已整合到 `content/office-comic/assets/office-comic/{asset_id}.png`；本輪四格規則、
路線判定、存檔遷移與自動揭露均以同一套自動化閘門驗證完成。
