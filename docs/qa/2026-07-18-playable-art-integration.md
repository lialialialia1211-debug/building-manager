# Playable Art Integration QA 紀錄

日期：2026-07-18
範圍：GitHub Pages preview 的部署前自動驗證與人工 QA 門檻。

## 自動驗證

- Tested game commit：`b067373fd816e089dd351756e96c07a1e3d20342`，已通過完整 `npm --prefix prototype-web run check`。
- Evidence commit：本 QA 證據以獨立報告提交保存，並與 tested game commit 分開記錄；它不改變已測遊戲提交。
- 驗證結果：content/assets validators 通過；Vitest 39 files、324 tests 通過；production build 與 Pages build 通過；三個 Playwright viewport 共 51 tests 通過。fresh profile 與 adult-off 路線不請求成人 manifest 或成人圖片，明確開啟的 adult-on 路線仍載入六張成人回想。
- Runtime gate：完整來源存在時通過 metadata 三件組、source/target byte parity 與 lock hash 驗證；模擬乾淨 checkout、整個來源根不存在時，committed runtime lock 驗證同樣通過。

## 部署狀態

- Workflow run URL：尚無 workflow run；部署需先完成審查，且不得以未驗證修改混入 tested game commit。
- GitHub Pages URL：尚未取得；workflow 必須成功後才可記錄。
- URL open result：尚未執行；尚未有已部署的 Pages URL 可供瀏覽器開啟。
- Manual QA：blocked。不得以 localhost、本機 dev server、`file://` 或本機 production build 替代 GitHub-hosted preview。

部署控制者必須以通過完整 `check` 的精確遊戲提交執行 Pages workflow。若 workflow 只接受 default branch，須先依核准方式將同一提交整合到 `main`，再由 `main` push 觸發；不得夾帶未測修改。

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
