# 可玩測試版美術整合 — QA 紀錄

- 日期：2026-07-19
- 範圍：把 `art/deliverables/` 的 87 張 panel + 2 張背景接進 React Web 遊戲，移除所有玩家可見 greybox，完成兩房六結局、12 秒動態回顧、畫廊重播與成人／安全分流。
- 分支：`codex/anima-art-spec-package`

## 自動化閘門（本機）

`npm --prefix prototype-web run check` 依序全數通過：

| 步驟 | 結果 |
|---|---|
| `assets:check-runtime` | PASS — runtime 包與來源位元組一致（75 共用 + 12 成人 + 2 背景）|
| `validate:content` | PASS — 兩房各 24 卡、12 選 6、三結局可達 |
| `validate:assets` | PASS — playable manifest 有效，成人資產隔離 |
| `test`（Vitest） | PASS — 34 檔 218 測試 |
| `build` | PASS — tsc + vite production build |
| `test:e2e`（Playwright） | PASS — 48 runs（3 viewport × room-a/room-b/adult-off 六路線 + adult-on intimacy + responsive + sixth-room）|

## 成人隔離證據

- adult-off 六路線（Room A／B 的 main／normal／intimacy）：`request` 監聽器斷言 **零** `/adult/` 與零 `adult-asset-manifest.json` 請求。
- intimacy 於 adult-off 使用安全序列（結果頁首幀 `a_safe_01`／`b_safe_01`），並顯示安全版說明。
- 新增 adult-on intimacy 路線：驗證成人設定開啟後才請求 `adult-asset-manifest.json`，回顧首幀為 `a_intimacy_01`。

## 已知缺口（發行前，不在本次 playable 範圍）

- 8 支 12 秒預輸出結局影片（目前以 runtime 動態回顧的六張選擇＋poster 取代）。
- 16 張 UI、16 張道具透明圖、6 張光效覆蓋。
- 原創角色重產（現為鳴潮 placeholder）；`formal` 美術門檻維持不變。

## 部署與人工 QA（待人工執行）

Pages 由 `gh-pages` 分支提供，base `/building-manager/`。在通過 `check` 的精確提交上執行：

```powershell
npm --prefix prototype-web run build:pages
npx --yes gh-pages --dotfiles --dist prototype-web/dist --branch gh-pages --message "deploy <commit-sha>"
```

- 部署的遊戲 commit：`<部署前以 git rev-parse HEAD 記錄>`（見本檔結尾）。
- Preview URL：`https://<owner>.github.io/building-manager/`（部署成功後填入並確認 HTTP 200、首屏背景、Room A／B 可進、成人預設關閉）。
- 人工 QA 只使用 GitHub-hosted preview（非 localhost）：兩房各三結局、畫廊重播、成人開關前後、第六房預告、三種 viewport 與 reduced-motion。
- 若 Pages 無法開啟：標記 manual QA blocked，不得改叫使用者測 localhost。

## Exact tested commit

- 見本次文件提交後的 `git rev-parse HEAD`。自動化閘門即在該提交上執行；部署此精確提交，勿加入未測修改。
