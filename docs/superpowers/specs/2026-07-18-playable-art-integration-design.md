# 《大樓管理員》可玩測試版美術整合設計

- 日期：2026-07-18
- 狀態：設計已核准，等待書面規格審閱
- 目標版本：完整可玩測試版
- 美術狀態：Anima 原生插畫風；角色仍是《鳴潮》placeholder，未達正式發行條件

## 1. 目標

把 `art/deliverables/` 中已交付的 87 張遊戲 panel、2 張房間背景與相關 metadata 接入 React Web 遊戲，取代所有玩家可見的 greybox 圖像。完成後，兩個房間、六種結局、成人／安全分流、回想圖鑑與第六房間預告都必須使用實際美術資產。

本階段的完成定義是「完整可玩測試版」，不是正式發行版。首頁必須清楚標示 placeholder art；未來原創角色重產後，應能在不修改故事 JSON 與畫面邏輯的前提下，依相同 asset ID 整批替換。

## 2. 非目標

- 不把《鳴潮》placeholder 宣稱為原創或正式最終美術。
- 不在本階段製作新的 T2I 圖、原創角色設計、音樂、語音或預先輸出的影片檔。
- 不實作尚未設計的第六房間遊戲內容；只呈現既有三張預告圖。
- 不開始 Godot 移植。
- 不要求補齊原正式美術契約中的 64 份角色參考、30 份環境／道具、16 份 UI 與 20 份分層包；這些仍屬 `formal` gate。

## 3. 交付包檢查結果

`art/deliverables/` 是美術來源與重生成依據，現況如下：

| 類別 | 數量 | 結果 |
|---|---:|---|
| 遊戲 panel | 87 組 | 每組都有 2560×1440 master、960×540 preview 與 metadata |
| 房間背景 | 2 組 | Room A、Room B 各一組 master／preview／metadata |
| 角色設定表 | 4 張 | 2400×684 PNG；只供美術參考，不直接顯示給玩家 |
| 結局影片 | 0 | 以 runtime 關鍵幀回想取代 |

182 張圖片均可解碼。所有 WebP 尺寸、RGB 模式、master／preview／metadata 配對都符合交付說明；最大 master 約 303 KB。

整合前需修正下列契約落差：

- 6 份 metadata 的 `asset_id` 多了 `card-` 前綴。
- 成人來源檔使用 `a_adult_*`／`b_adult_*`，現有內容契約使用 `a_intimacy_*`／`b_intimacy_*`。
- 結局來源檔使用 `a_poster_*`／`b_poster_*`，現有內容契約使用 `a_ending_*`／`b_ending_*`。
- `a_poster_intimacy` 與 `a_safe_06`、`b_poster_intimacy` 與 `b_safe_06` 是刻意共用的相同圖像，符合交接說明。

以下 placeholder 品質問題記錄為已知限制，不阻擋測試版整合：

- 兩位男角使用相同 placeholder 臉型，主要靠服裝區分。
- `sixth_03` 是發光數字 6，不是原規格的六格徽記。
- `a2n_follow` 留白很大，敘事性弱；`a1_note` 的構圖也偏離早期文字規格。
- master 是由 1536×864 以 Lanczos 放大至 2560×1440，不視為最終銳利度基準。

## 4. 資產來源與 runtime 包

`art/deliverables/` 保持原始檔名、metadata 與生成紀錄，遊戲不得直接公開或讀取這個目錄。新增可重跑的資產同步腳本，將通過白名單的 runtime 圖片複製並正規化到 `content/assets/`。

```text
art/deliverables/                  美術來源與重生成依據
content/assets/common/             共用、一般與安全 runtime 圖片
content/assets/adult/              12 張成人 runtime 圖片
content/asset-manifest.json        啟動時載入的共用 manifest
content/adult-asset-manifest.json  只在成人內容開啟後載入
```

同步腳本必須：

1. 驗證來源 master、preview 與 metadata 三者齊全。
2. 把來源 ID 映射為既有 canonical asset ID。
3. 只複製遊戲需要的 master 與 preview，不公開生成 prompt、seed、review 圖或角色 placeholder 設定表。
4. 產生穩定排序的 manifest，重跑不得造成無意義 diff。
5. 遇到缺檔、重複 ID、未知 ID 或非法路徑時立即失敗。

## 5. Manifest schema v2

共用 manifest 升級為 schema v2，每個 panel 提供 preview 與 full 路徑。新增 `playable` mode，表示素材足以完成測試版；既有 `formal` mode 保留給未來完整原創交付，不能因本次整合而降低原 gate。

共用 manifest 包含：

- 48 張候選卡。
- 6 張開場圖。
- 6 張普通／主線／親密 ending poster。
- 12 張安全親密序列。
- 3 張第六房間預告。
- 2 張房間背景。

成人 manifest 只包含 12 張 `a_intimacy_01–06`／`b_intimacy_01–06`。兩份 manifest 合併後必須精確覆蓋 87 個 canonical panel ID；共用 manifest 本身不得包含 `/adult/` 路徑、成人縮圖或成人 metadata。

前端以統一 `AssetCatalog` 提供下列能力：

- 依 asset ID 取得 preview 或 full URL。
- 啟動時只載入共用 manifest。
- 成人內容開啟後才 lazy-load 成人 manifest。
- 成人內容關閉時不建立成人圖片 DOM、不預載成人 URL，也不發出任何 `/adult/` 請求。
- 切回安全模式後立即移除目前 DOM 中的成人圖並清除記憶體中的成人 catalog；瀏覽器已完成的快取不屬於應用程式可可靠清除的範圍。

GitHub Pages 是靜態公開託管。成人關閉保證的是應用程式不載入或顯示成人資產，不是對已知靜態 URL 提供存取控制；若未來需要真正的權限隔離，必須改用具認證與授權的伺服器。

## 6. 畫面整合

### 6.1 大樓首頁

- Room A／B 房間按鈕分別使用兩張房間背景。
- 首頁顯示「可玩測試版／placeholder art」標記。
- 玩家同時完成兩房主線結局後，以 `sixth_01–03` 顯示三段式異象預告；不新增可進入的第六房間路由。

### 6.2 房間開場

點擊「開始」後，先播放房間對應的 `open_01–03` 三張圖與既有開場對話。玩家可逐張前進或跳過；重新遊玩仍可再次觀看。四張角色設定表只保留在美術來源中，不放進玩家 runtime 包。

### 6.3 選卡與漫畫頁

- 候選區只載入 960×540 preview。
- 玩家把卡放進六格後才載入該張 master。
- 六格排列、拖放、確認、逐格揭示、對話、數值、線索與讀取速度邏輯維持不變。
- 玩家可見的漫畫圖與候選圖不得再呼叫 greybox 產生器。
- 圖片網路失敗時顯示可辨識的錯誤 panel 與重試操作，不默默退回 greybox。

### 6.4 結局與 12 秒 runtime 回想

沒有預先輸出的八支影片，因此以現有圖像組成 runtime cinematic：

- 普通／主線：本局六張已選 master 加 ending poster，共七幀，平均分配為 12 秒。
- 成人親密：六張成人 full 圖，總長 12 秒。
- 安全親密：六張 safe full 圖，總長 12 秒。
- 每幀使用交叉淡入與輕微平移／縮放；不加入音訊。
- 回想完成後固定顯示 ending poster、結局文字、數值、線索與圖鑑獎勵。
- `prefers-reduced-motion` 下移除平移／縮放，改為簡單淡入；若使用者要求完全停用動畫，直接顯示最後一幀。

### 6.5 圖鑑

- 親密結局重播專用六幀成人或安全序列。
- 普通／主線保存玩家最近一次完成該結局的六張選擇，圖鑑使用這六張與 poster 重播。
- 舊存檔沒有回想資料時，以三張開場圖加 ending poster 作 fallback。
- 提供播放、暫停、重新播放與逐幀查看。

## 7. 進度資料相容性

進度資料新增 optional `endingRecaps`，以房間與結局為索引，保存最近一次完成該結局的六個 panel ID。載入舊版進度時預設為空物件，不清除已完成結局、線索、圖鑑或設定。

保存前必須驗證 recap 只包含該房間存在的 panel ID，且最多六個。無效資料要被捨棄並使用圖鑑 fallback，不能讓整份進度載入失敗。

## 8. 錯誤處理

- 共用 manifest 載入失敗：阻止開始遊戲，顯示原因與重試。
- 成人 manifest 載入失敗：維持安全資產，提示成人回想暫時不可用，不影響其他玩法。
- 單張 preview 載入失敗：候選卡保留文字標籤與重試能力。
- 單張 master 載入失敗：保留該格遊戲狀態並允許重新請求。
- asset ID 缺失：開發與 build 驗證直接失敗；production 顯示明確錯誤，不產生錯誤的替代圖。

## 9. 自動驗證

所有實作完成後必須通過 `npm --prefix prototype-web run check`。新增驗證至少涵蓋：

1. 87 張 panel、2 張背景及 preview／full 配對精確完整。
2. manifest schema v2、`playable`／`formal` mode 與 canonical ID 映射。
3. 共用 manifest 不含 `/adult/` 路徑；成人 manifest 只含 12 個成人 ID。
4. 所有玩家畫面不再使用 greybox。
5. 候選卡只使用 preview，選入漫畫格後才請求 full。
6. 成人內容關閉時，E2E 網路紀錄沒有任何 `/adult/` 請求。
7. 成人內容開啟後才載入成人 manifest 與成人圖。
8. 六種結局的 12 秒回想、poster 與獎勵流程。
9. 圖鑑重播、舊存檔 fallback 與 `endingRecaps` migration。
10. 手機版、鍵盤操作與 reduced-motion。

資產同步腳本也必須納入 `check`，確保已提交的 runtime 包與來源交付同步；任何差異都應讓驗證失敗並提示重新執行同步。

## 10. GitHub Preview 與人工 QA

自動驗證通過後才可進入人工 QA。必須提交 exact tested commit，將該提交部署到 GitHub Pages，確認 preview URL 可成功開啟，並先在 `docs/qa/web-prototype-acceptance-report.md` 記錄 commit 與 URL。

人工 QA 只使用 GitHub-hosted preview，不使用 localhost、`file://` 或本機 production build。驗收重點包括：

- 兩房完整六步遊玩與六種結局。
- 12 張候選同屏的可讀性與選卡效能。
- 成人開關前後的內容、網路請求與圖鑑分流。
- 12 秒回想、重播控制與 reduced-motion。
- 手機與桌面版畫面。
- placeholder 標記與已知品質限制是否清楚。

## 11. 完成條件

本階段只有在下列條件全部成立時才算完成：

- 交付包通過同步與 manifest 驗證。
- 玩家可見畫面不再使用 greybox。
- 兩房與六種結局完整可玩。
- 成人關閉 E2E 證明沒有 `/adult/` 請求。
- 回想圖鑑與舊存檔相容。
- 完整 `check` 通過。
- exact commit 已部署至 GitHub Pages，preview URL 已開啟並記錄。

此完成狀態仍是可玩測試版。正式發行仍受原創角色、正式 UI／道具／分層資產、影片／音訊、人工美術 QA 與 Godot migration gate 約束。
