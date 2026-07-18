# 《大樓管理員》美術整包交接（→ Codex 落地用）

- 定稿日期：2026-07-18
- 產線：本地 ComfyUI 0.26.0 + Anima Aesthetic v1.1（2B / CircleStone Labs）
- 風格：**Anima 原生插畫風**（Zhi 2026-07-18 拍板，取代原賽璐璐規格；風格決策已回寫 `docs/art/2026-07-17-anima-production-package/01、06`）
- 角色：**鳴潮 placeholder**（林雨薇=長離、許安寧=散華、陳皓然/周衍=男漂泊者，服裝按角色 Bible）——正式角色設計定案後需整批換角重產

## 交付清單（87 張主構圖契約：齊）

| 位置 | 內容 | 數量 |
|---|---|---:|
| `panels/room_a/` | 24 候選卡 + 3 開場（a_open_01-03）+ 3 poster（main/normal/intimacy） | 30 |
| `panels/room_b/` | 24 候選卡 + 3 開場 + 3 poster | 30 |
| `panels/intimacy/` | 成人序列關鍵幀 a/b_adult_01-06 | 12 |
| `panels/safe/` | 安全序列關鍵幀 a/b_safe_01-06 | 12 |
| `panels/sixth_room/` | 第六房間預告 sixth_01-03 | 3 |
| `backgrounds/` | Room A/B 空景 | 2 |
| `characters/` | 四角設定表（4角度+2表情、ADULT 標頭） | 4 |

每個 panel 三檔：`{panel_id}_master.webp`（2560×1440、q88、全部 <550KB）＋ `{panel_id}_preview.webp`（960×540）＋ `{panel_id}_meta.json`（seed/參數/來源/備註，可回溯）。

## Runtime 接線注意（Codex 必讀）

1. `content/asset-manifest.json` 目前為 greybox——正式接圖時把 panel_id 對映到本目錄；**panel_id 與 `content/rooms/*.json` 的卡片 ID 一一對應**（如 `a1_fuse`）。
2. **成人隔離**：`panels/intimacy/` 整目錄屬成人資產。成人開關關閉時零載入（含縮圖/預載/metadata），對應規格 07 §7。安全替代用 `panels/safe/` 同 ID 對位（a_adult_N ↔ a_safe_N）。
3. intimacy poster 用的是 safe_06 錨點（規格 05 §10），安全模式可直接顯示。
4. 開場/poster 的 asset ID 是本次新定義（規格未給細名）：`{room}_open_{n}`、`{room}_poster_{normal|main|intimacy}`，manifest 命名照此。
5. **尚未交付**（不在 87 張契約內）：UI 16 張（建議程式端元件實作、不做 T2I）、8 支 12 秒結局影片（規格 07 §0 明定由使用者處理；起始/結束幀可直接取 safe/adult 序列＋poster）、道具透明圖 16、光效覆蓋 6。

## 已知品質保留項（placeholder 等級，換正式角色時一併修）

- 兩位男角同臉（男漂泊者），靠服裝區分；同框卡（無）不受影響
- `sixth_03` 徽記畫成數字 6 而非六格 grid；`a1_note`、`a2n_follow` 構圖偏離規格描述（surreal 化）
- 散華的異色瞳/嘴下痣等小特徵在遠景會掉；量產正式版建議角色 LoRA + Anima LLLite 姿勢控制
- 全部 master 是 1536×864 lanczos 放大到 2560×1440；要更銳利可用 ESRGAN 系再過一次（meta.json 已記錄）

## 重生成方式

任何一張不滿意：讀該圖 `_meta.json` 的 prompt/seed → 改 seed 重跑（workflow 見 `docs/art/.../06`，腳本範本 `D:/AI/workflows/saved/anima_t2i/anima_queue.py`）。候選對比圖全部在 `../nativestyle-2026-07-18/_review/`。
