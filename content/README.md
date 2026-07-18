# 共用內容與 runtime 資產

`content/` 是 Web 原型與後續引擎共用的故事資料、資產清單與 runtime 素材來源。Web 原型以此目錄為 Vite public directory；不要從 `art/` 直接載入素材，也不要變更 `art/deliverables/HANDOFF.md`。

## 資料與 manifest

- `characters.json`、`rooms/*.json` 與 `gallery.json` 定義劇情、房間與圖鑑資料。
- `asset-manifest.json` 是 common runtime manifest，收錄背景、safe panel、結局 poster、縮圖與 placeholder；它不得包含 `/adult/` 路徑或成人 metadata。
- `adult-asset-manifest.json` 是成人 runtime manifest，只收錄 12 個 `a_intimacy_01` 至 `a_intimacy_06` 與 `b_intimacy_01` 至 `b_intimacy_06` canonical asset IDs。
- `runtime-assets.lock.json` 記錄 89 組來源三件組、canonical/source/metadata ID 映射、runtime target 與 SHA-256；乾淨 checkout 不含 `art/` 時，CI 仍以這份受版本控制的 inventory 驗證 runtime bytes。
- `assets/common/` 存放 common runtime 檔案；`assets/adult/` 存放成人 runtime 檔案。成人內容關閉時，應用程式不得請求後者。

已交付來源 metadata 的名稱會在同步時改為 repository 的 canonical asset ID；runtime 路徑、manifest 和內容 JSON 都只使用 canonical 名稱，不依賴來源檔案命名。

## 同步與驗證

在 repository 根目錄執行：

```powershell
npm --prefix prototype-web run assets:sync
npm --prefix prototype-web run assets:check-runtime
npm --prefix prototype-web run validate:content
npm --prefix prototype-web run validate:assets
```

`assets:sync` 必須在完整 `art/deliverables/` 來源存在時執行；它會驗證每組 master、preview、metadata、metadata ID 與輸出映射，再更新 runtime 資產、manifest 和 lock。`assets:check-runtime` 在來源存在時額外驗證 source/target byte parity；來源根完全不存在時仍以 committed lock 驗證所有 runtime target，來源只存在一部分則直接失敗。這些命令以及完整 `npm --prefix prototype-web run check` 都不會修改 `art/deliverables/HANDOFF.md`。

## playable 與 formal 發行狀態

目前已把可用來源接入 `playable` placeholder runtime：兩房路線、畫廊、成人開關、第六房與可重播的 12 秒 recap 均由自動化驗證覆蓋。`formal` mode 仍是正式發行 gate，尚未達成。

正式發行仍缺少 8 支影片、16 個 UI、16 個 props 與 6 組 lights。這些缺口不會因 placeholder runtime 而消失；`art/deliverables/HANDOFF.md` 保持原樣，作為原始美術交付紀錄。

GitHub Pages 是公開靜態託管。成人關閉保護的是應用程式載入與呈現行為；若需要 URL 層級的權限隔離，正式發行必須改用具備認證與授權的服務。
