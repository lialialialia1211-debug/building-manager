# 大樓管理員

《大樓管理員》（設計暫名：《夜窗管理員》）是一款單機成人向劇情推理／動態漫畫遊戲。本儲存庫包含已實作的 Web prototype：玩家可在兩個房間中完成各六次選擇，抵達主線、普通或親密結局，並測試跨房線索、成人內容切換、圖鑑與本機進度保存。

## 執行 Web prototype

需求為 Node.js 24.14.x。

```powershell
npm --prefix prototype-web install
npm --prefix prototype-web run dev
```

開發伺服器啟動後，依終端顯示的本機網址開啟原型。

完整檢查會依序執行內容與資源驗證、單元／元件測試、production build 與 Chromium E2E：

```powershell
npm --prefix prototype-web run check
```

## 目前限制

- `content/asset-manifest.json` 目前為 `greybox` mode，因此畫面使用測試用灰盒資源，尚未包含正式美術檔。
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
