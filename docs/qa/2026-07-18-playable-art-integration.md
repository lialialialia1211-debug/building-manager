# Playable Art Integration QA 紀錄

日期：2026-07-18
範圍：GitHub Pages preview 的部署前自動驗證與人工 QA 門檻。

## 自動驗證

- Tested game commit：`b067373fd816e089dd351756e96c07a1e3d20342`，已通過完整 `npm --prefix prototype-web run check`。
- Evidence commit：本 QA 證據以獨立報告提交保存，並與 tested game commit 分開記錄；它不改變已測遊戲提交。
- 驗證結果：content/assets validators 通過；Vitest 39 files、324 tests 通過；production build 與 Pages build 通過；三個 Playwright viewport 共 51 tests 通過。fresh profile 與 adult-off 路線不請求成人 manifest 或成人圖片，明確開啟的 adult-on 路線仍載入六張成人回想。
- Runtime gate：完整來源存在時通過 metadata 三件組、source/target byte parity 與 lock hash 驗證；模擬乾淨 checkout、整個來源根不存在時，committed runtime lock 驗證同樣通過。

## 部署狀態

- Deployed game commit：`b067373fd816e089dd351756e96c07a1e3d20342`。
- Pages deploy commit：`508646a88a132fec046815f3d73c54684f326991`。
- Workflow run URL：https://github.com/lialialialia1211-debug/building-manager/actions/runs/29631690155
- GitHub Pages URL：https://lialialialia1211-debug.github.io/building-manager/
- URL open result：開啟成功；首頁、`qa-build.json`、common manifest 與 Room A JSON 均為 HTTP 200，瀏覽器互動 smoke 通過。
- Manual QA：READY。只可使用上述 GitHub-hosted preview；localhost、本機 dev server、`file://` 與本機 production build 都不可替代。

GitHub Pages 由既有 `gh-pages` legacy deployment 發佈精確 tested game artifact；公開 `qa-build.json` 的 `sourceCommit` 已核對為 `b067373fd816e089dd351756e96c07a1e3d20342`。

## 線上 smoke 證據

- 大樓首屏與 Room A／Room B 入口可見；兩張房間背景皆完成解碼為 2560×1440，沒有 runtime image error。
- 設定頁「成人內容」未勾選；目前頁面觀測到 21 張圖片、共 26 個資產，成人 manifest／`/assets/adult/` 圖片為 0。
- Room A 簡介背景與三張開場預覽完成解碼；進入開場後可跳過至 12 選 6 編排。
- 12 張候選的按鈕都有可見行動文字；實際點選「查看門口」後成功加入第 1 格。
- 遊戲畫面 15 張圖片完成載入後，broken images 0、runtime image errors 0、browser console errors 0。

## 人工 QA 路線（僅限已開啟的 Pages URL）

1. Room A 的 main、normal、intimacy 三種結局。
2. Room B 的 main、normal、intimacy 三種結局。
3. 圖鑑、成人開關與第六房路線。
4. 1920×1080、1280×720、1280×800 三個 viewport。
5. 首屏背景、Room A／B 可進入、成人內容預設關閉，以及結局與圖鑑的播放、暫停、重播、逐格控制。

## 已知正式發行缺口

- `playable` runtime 是 placeholder 整合；`formal` mode 仍是正式發行 gate。
- 正式發行尚缺 8 支影片、16 個 UI、16 個 props 與 6 組 lights。
- 12 秒 recap 是可重播的 runtime 展示，並非正式影片交付。
- `art/deliverables/HANDOFF.md` 維持原樣；本 QA 紀錄不會重寫原始美術交付內容。
