# 成人內容關閉狀態六結局 E2E 證據設計

- 日期：2026-07-17
- 狀態：已核准，待實作規劃
- 範圍：Web 原型自動化測試與驗收文件

## 1. 目標

補齊成人內容關閉時兩個房間共六個主要結局的瀏覽器端到端證據。每條路線都必須完成正確結局，且整個流程不得請求 URL 路徑含 `/adult/` 的資源；兩條親密結局還必須顯示各房間指定的安全替代結果素材。

本項工作只擴充測試與驗收證據，不改變遊戲規則、正式內容、production code 或 Godot migration 決策。

## 2. 成功條件

六條 canonical routes 分別為 Room A 與 Room B 的 `main`、`normal`、`intimacy` 結局。每條路線均須在下列三組既有 Playwright viewport 執行：

- 1920×1080（`desktop-1080`）
- 1280×720（`desktop-720`）
- 1280×800（`steam-deck-ratio`）

因此 adult-off 證據共包含 18 runs。每個 run 必須：

1. 以 `adultContent: false` 與固定 deal seed 啟動。
2. 選入指定六張 panel 並完成整段揭曉。
3. 顯示該路線的正確結局標題。
4. 從導覽前到結果畫面期間，不產生任何 URL 含 `/adult/` 的 request。
5. 若為 Room A 親密結局，結果素材 ID 必須是 `a_safe_06`。
6. 若為 Room B 親密結局，結果素材 ID 必須是 `b_safe_06`。

## 3. 測試資料邊界

新增 `prototype-web/tests/e2e/ending-routes.ts`，集中保存六條 canonical routes。每條資料包含：

- 房間識別與可供 UI 查找的房間名稱。
- 結局 ID。
- 預期結局標題。
- 可重現的 deal seed。
- 六個 panel IDs。
- 親密結局可選的預期安全結果素材 ID。

`room-a.spec.ts` 與 `room-b.spec.ts` 改為匯入各自的三條路線；`adult-toggle.spec.ts` 匯入全部六條。canonical route 不得在這三個測試檔中重複定義，以避免 seed、panel IDs 或預期標題日後漂移。

測試資料只存在 `tests/e2e`，不得加入 `content/` JSON 或 production bundle。

## 4. Adult-off 測試流程

`adult-toggle.spec.ts` 對六條 route 參數化執行：

1. 在呼叫 `playRoute` 前註冊 page request listener。
2. 收集 URL 含 `/adult/` 的完整 request URL，保留為失敗診斷資訊。
3. 呼叫既有 `playRoute`，傳入 route 的 room name、panel IDs、deal seed 與 `adultContent: false`。
4. 驗證預期結局標題可見。
5. 驗證成人資源 request 清單為空。
6. route 若定義安全結果素材 ID，驗證 `result-art` 的 `data-asset-id` 完全相符。

測試名稱必須包含房間與結局 ID，使 Playwright 在任何 viewport 失敗時能直接指出路線。request 清單若非空，斷言輸出必須保留實際 URL，不只回報布林結果。

## 5. 既有測試相容性

Room A 與 Room B 原有成人內容開啟路線仍維持三結局測試，只把 route 定義改為共用匯入。`playRoute` 的行為與 production code 不需要變更。

現有 adult-off Room A 親密路線會由六路線矩陣涵蓋，因此不保留內容相同的獨立重複案例。

## 6. 驗證與證據更新

實作後依序執行：

1. Adult-off 專項 Playwright 測試，預期 18 runs 全數通過。
2. `npm --prefix prototype-web run check`，包含內容驗證、資產驗證、單元／元件測試、production build 與完整 E2E。

在目前基線上，完整 E2E 預期由 30 增至 45 runs；單元／元件測試預期維持 201 項。若實際計數不同，文件必須記錄真實輸出並說明差異，不得為符合預期而改寫數字。

驗證通過後：

- 更新 `docs/qa/web-prototype-acceptance-report.md`，記錄 adult-off 6/6、18 runs、完整 E2E 計數及被測 implementation commit。
- 更新 `docs/decisions/godot-migration-gate.md`，將成人內容開啟與關閉時六結局可完成標為通過，並引用同一份自動化證據。
- 保留真人 playtest 與正式美術驗收為未完成。
- 保留 `CONTINUE Web iteration`；不得因此核准或開始 Godot migration。

## 7. 非目標

- 不新增或修改結局內容。
- 不修改成人內容切換的 production 行為，除非實作測試時發現真實缺陷；若發現缺陷，必須另行診斷並重新確認修復範圍。
- 不加入新的 viewport 或瀏覽器引擎。
- 不進行人工 QA、真人 playtest、正式美術替換或 GitHub Pages 發布。
- 不解除 Godot migration 的其他門檻。
