# Godot 移植門檻

本文件延續原本「先驗證 Web 原型，再決定是否移植」的決策。只有下列所有門檻都有實測證據，且 `APPROVE Godot migration plan` 經人工核准後，才可開始 Godot 實作或另立正式移植計畫。自動化通過不能取代真人玩家測試、美術驗收或最終核准。

自動化證據基線：2026-07-17，commit `0f756ead5fab15d8bc8ba5472d078c301de7dd7e`（Task 14 前 HEAD）。完整結果記錄於 `docs/qa/web-prototype-acceptance-report.md`。

## 門檻

- [x] 兩個自動化房間圖皆為零斷路；每條合法路線都在六次選擇後抵達結局。
- [ ] 六個結局在成人內容開啟與關閉時都可完成；目前六個結局僅在預設成人內容開啟狀態有 E2E 證據，關閉狀態只驗證 Room A 親密結局的安全資源流程，尚未完成 6/6 關閉狀態證據。
- [ ] 至少 10 人完成一個房間。
- [ ] 至少 5 人完成兩個房間。
- [ ] 無對白抽樣候選三選一中，至少 80% 可正確區分三個行動意圖。
- [ ] 至少 60% 測試者自願重玩，或明確表示想尋找另一個結局。
- [ ] 首次完成兩房的中位時間為 35–55 分鐘。
- [ ] 任一候選結果被評為「與圖片無關」的比例不得超過 20%。
- [ ] 26 項 style-lock package 已由美術驗收核准。
- [ ] 3 秒動態測試沒有重大臉部、手部、服裝或背景漂移。
- [x] 1280×720 與 1280×800 版面沒有阻擋操作的重疊；Chromium E2E 已在兩個尺寸檢查完整候選區與漫畫操作區。
- [x] 已驗證的 `content/` JSON 不包含 Web-only 行為；瀏覽器儲存、下載與畫面行為保留在 `prototype-web/`。

## 目前決策

- [ ] APPROVE Godot migration plan
- [x] CONTINUE Web iteration

真人玩家測試與美術驗收仍為 `NOT RUN`，因此目前不得開始 Godot implementation 或 migration planning。完成量測後，必須把證據補入驗收報告並由負責人明確勾選核准；在此之前維持 Web iteration。
