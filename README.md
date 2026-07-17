# 共用內容資料

此目錄將保存引擎無關的故事與資源資料：

- `characters.json`
- `rooms/room_a_blackout.json`
- `rooms/room_b_wall.json`
- `gallery.json`
- `asset-manifest.json`

Web 原型與後續正式引擎必須使用相同資料契約。

正式房間內容目前採 12 選 6 編排契約：

- `drafting`：每次發 12 張、選 6 張，以及確保三結局可達的少量必發卡。
- `openingDialogue`：固定開場完整文本。
- `panels.{id}.dialogue`：確認編排後才揭曉的完整事件文本。
- `panels.{id}.artBrief`：正式產圖必讀的構圖、人物、道具、光線與連續性規格。
- `endingContent.{ending}.dialogue`／`artBrief`：三種固定結尾的故事與美術要求。

舊 `nodes`／`next` 欄位暫時保留作舊存檔與第一版灰盒相容，不是正式玩家流程。
