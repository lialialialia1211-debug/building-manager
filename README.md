# 大樓管理員

《大樓管理員》（設計暫名：《夜窗管理員》）是一款單機成人向劇情推理／動態漫畫遊戲。本儲存庫包含已實作的 Web prototype：玩家可在兩個房間中完成各六次選擇，抵達主線、普通或親密結局，並測試跨房線索、成人內容切換、圖鑑與本機進度保存。

## 執行 Web prototype

需求為 Node.js 24.14.x。

```powershell
npm --prefix prototype-web install
npm --prefix prototype-web run dev
```

開發伺服器啟動後，依終端顯示的本機網址開啟原型。

完整檢查會依序執行資源同步驗證、內容與資源驗證、單元／元件測試、production build 與 Chromium E2E：

```powershell
npm --prefix prototype-web run check
```

## 可玩測試版美術與資源同步

美術來源是 `art/deliverables/`（原始檔名、metadata、生成紀錄）；前端只讀 `content/assets/`。兩者以可重複執行的同步腳本連結：

```powershell
npm --prefix prototype-web run assets:sync           # 由來源重建 content/assets 與兩份 manifest
npm --prefix prototype-web run assets:check-runtime   # 位元組比對 runtime 包與來源是否同步（check 會先跑）
```

- 同步後 `content/asset-manifest.json` 是 schema 2 的 `playable` mode（75 張共用 + 2 張背景），成人 12 張則獨立在 `content/adult-asset-manifest.json` 與 `content/assets/adult/`。
- `playable` 模式代表素材足以完成可玩測試版；既有 `formal` 門檻保留給未來完整原創交付（64 角色參考、30 環境道具、16 UI、20 分層包），不因本次整合而降低。
- 成人隔離：共用 manifest 不含 `/adult/`；成人設定關閉時不載入成人 manifest、不建立成人圖片 DOM、不發出任何 `/adult/` 請求，改以安全序列完成流程。
- 結局回顧為 runtime 產生：以本局六張選擇（或舊存檔的三張開場圖）加結局海報組成 12 秒動態回想；正式的 8 支預輸出影片、16 UI、16 道具、6 光效仍未交付，屬發行前缺口。

## 部署到 GitHub Pages（gh-pages 分支）

Pages 由 `gh-pages` 分支提供服務，base 為 `/building-manager/`。在通過 `check` 的精確提交上建置並推送 `prototype-web/dist`（人工執行，勿由自動化推送）：

```powershell
npm --prefix prototype-web run build:pages
npx --yes gh-pages --dotfiles --dist prototype-web/dist --branch gh-pages --message "deploy <commit-sha>"
```

## 目前限制

- 玩家可見畫面已改用已交付美術，先前的 `greybox` 佔位資源已移除；原創角色、UI、道具、影片等**正式美術**仍是發行前缺口，`formal` 門檻維持不變。
- playtest export 僅限本機下載與人工分享；原型不會上傳測試紀錄，也沒有遠端分析服務。
- Godot migration gate 仍受阻擋。必須先完成真人玩家、美術品質與成人內容關閉狀態的驗收證據，並取得人工核准，才可制定或開始 Godot 移植。

## 儲存庫結構

```text
prototype-web/   React／TypeScript Web prototype
content/         引擎無關的故事 JSON 與資源清單
game-godot/      Gate 核准後才會進入的正式遊戲目標
docs/            產品、實作、美術、決策與驗收文件
```

主要文件：

- [遊戲設計規格](docs/superpowers/specs/2026-07-16-night-window-manager-design.md)
- [Web prototype 實作計畫](docs/superpowers/plans/2026-07-16-night-window-manager-web-prototype.md)
- [Anima 美術生產包（最新核准規格）](docs/art/2026-07-17-anima-production-package/README.md)
- [劇情與美術設計總規格](docs/superpowers/specs/2026-07-17-anima-story-art-design.md)
- [舊版 Web 原型 AI 美術生產規格（歷史基線）](docs/art/2026-07-16-web-prototype-art-production-spec.md)
- [Web prototype 驗收報告](docs/qa/web-prototype-acceptance-report.md)
- [Godot migration gate](docs/decisions/godot-migration-gate.md)
