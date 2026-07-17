# Web 原型驗收報告

- 自動化執行日期：2026-07-17
- 自動化測試 commit：`d62fab34987ca00416590b5e6aeb012454396557`（adult-off 6/6 E2E 實作 commit）
- 人工 QA GitHub 預覽網址：https://lialialialia1211-debug.github.io/building-manager/
- Pages 靜態產物來源：remote `gh-pages` branch，source commit `09720f7ac2777a5311dba657b0f8d4dcd9782cba`。
- 人工 QA 環境狀態：READY；Pages build `fe9241e940b4d09b793bc6202888936ead0a1b7a` 已發布。
- 線上 smoke test：PASS；首頁、Room A JSON、`qa-build.json` 均為 HTTP 200；Chromium 從大樓進入 Room A 後顯示 12 張候選與 6 個槽，實際拖曳兩張卡、交換槽位、補滿六格、確認編排並完成至結局故事。Console errors 0，request failures 0。
- 第一輪測試者：NOT RUN
- 第二輪測試者：NOT RUN

## 自動化

- Content validation：PASS；兩房各 24 張完整劇情卡、每局 12 張不重複牌、12 選 6 組合可收束三種結局。
- Asset validation：PASS；mode 為 `greybox`，尚不要求正式美術檔。
- Unit/component tests：PASS；201 tests。
- E2E tests：PASS（45 runs：18 adult-on 路徑 + 18 adult-off 路徑 + 6 responsive runs + 3 sixth-room runs）。
- Adult-off 證據：PASS；Room A／Room B 的 main、normal、intimacy 於 3 個 viewport 共 18 runs，零 `/adult/` requests；兩個 intimacy endings 分別使用 `a_safe_06` 與 `b_safe_06`。
- Production build：PASS；`prototype-web/dist/index.html` 已產生。

## 玩家證據

- 首次完成一房的中位時間：NOT RUN
- 首次完成兩房的中位時間：NOT RUN
- 自願重玩率：NOT RUN
- 候選行動意圖辨識率：NOT RUN
- 12 選 6 編排理解率：NOT RUN
- 確認前換位／移除使用率：NOT RUN
- 結果預測公平性：NOT RUN
- 對大樓共同謎團的興趣：NOT RUN

## 美術證據

- 26 項 style-lock package 核准：NOT RUN
- 角色一致性 defects：NOT RUN
- 手部／道具 defects：NOT RUN
- 1280×720 真人可讀性驗收：NOT RUN
- 3 秒動態穩定性：NOT RUN

## 尚未解除的阻擋

- NOT RUN：第一輪 5 人與第二輪至少 5 人的真人玩家測試。
- NOT RUN：12 張候選辨識、編排理解、重玩意願、完成時間、結果關聯性與共同謎團興趣的量測。
- NOT RUN：正式美術 style-lock、角色／手部／道具一致性與 3 秒動態穩定性驗收。
- 在以上證據完成並經人工核准前，不得核准 Godot migration plan。
