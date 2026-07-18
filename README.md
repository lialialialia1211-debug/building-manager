# 共用內容資料

此目錄將保存引擎無關的故事與資源資料：

- `characters.json`
- `rooms/room_a_blackout.json`
- `rooms/room_b_wall.json`
- `gallery.json`
- `asset-manifest.json`（schema 2、`playable` mode 共用 manifest）
- `adult-asset-manifest.json`（成人專用，僅成人設定開啟後載入）
- `assets/common/`、`assets/adult/`（由同步腳本產生的 runtime 圖片）

Web 原型與後續正式引擎必須使用相同資料契約。

## Runtime 資源同步

`assets/` 與兩份 manifest 都由 `art/deliverables/` 經同步腳本產生，請勿手動編輯：

- `npm --prefix prototype-web run assets:sync`：由來源重建 `assets/common`、`assets/adult` 與兩份 manifest。
- `npm --prefix prototype-web run assets:check-runtime`：位元組比對 runtime 包與來源，差異即失敗並提示重新同步。
- Canonical rename：來源若使用 `a_adult_*`／`a_poster_*` 會正規化為 `a_intimacy_*`／`a_ending_*`（現行交付已是 canonical）。
- 共用 manifest 不得包含 `/adult/`；成人 12 張只在 `adult-asset-manifest.json` 且路徑位於 `/assets/adult/`。

正式房間內容目前採 12 選 6 編排契約：

- `drafting`：每次發 12 張、選 6 張，以及確保三結局可達的少量必發卡。
- `openingDialogue`：固定開場完整文本。
- `panels.{id}.dialogue`：確認編排後才揭曉的完整事件文本。
- `panels.{id}.artBrief`：正式產圖必讀的構圖、人物、道具、光線與連續性規格。
- `endingContent.{ending}.dialogue`／`artBrief`：三種固定結尾的故事與美術要求。

舊 `nodes`／`next` 欄位暫時保留作舊存檔與第一版灰盒相容，不是正式玩家流程。
