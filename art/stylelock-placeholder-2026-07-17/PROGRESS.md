# 階段 1 風格鎖定包進度（鳴潮 placeholder 版）

- 日期：2026-07-17
- 產線：本地 ComfyUI 0.26.0 + Anima Aesthetic v1.1（正式 Profile：1536×864 / 36 steps / CFG 4.5 / er_sde / simple）
- 依據：docs/art/2026-07-17-anima-production-package（07 §階段1，26 項）
- 狀態：批次生成中

## Placeholder 對映（Zhi 指示：女角用鳴潮女角、男主用男漂泊者）

| 規格角色 | 暫代 | danbooru 錨點 | 圖量 |
|---|---|---|---|
| 林雨薇 | 長離 Changli | changli (wuthering waves)，粉紅漸層長髮馬尾、羽飾、琥珀眼 | 3597 |
| 許安寧 | 散華 Sanhua | sanhua (wuthering waves)，灰髮單辮、紅眼異色瞳、嘴下痣 | 436 |
| 陳皓然 | 男漂泊者 | rover (wuthering waves) + 1boy，黑髮編髮束、黃眼 | — |
| 周衍 | 男漂泊者 | 同上；兩位男性靠規格服裝區分（深藍工作襯衫 vs 石墨立領外套） | — |

原則：**只換臉/髮/眼身分，服裝與道具維持規格 Character Block**（保卡片可讀性、兩男可區分）。

## 26 項清單（2026-07-17 批次完成，98+4 張生成、0 失敗）

- [x] 角色設定表 ×4 → `characters/<id>/char-<id>-sheet-v01.png`（含姓名/年齡/身高/ADULT 標頭）
- [x] 表情胸像 ×8 → 已併入設定表末兩格（原檔在 ComfyUI output/stylelock/busts/）
- [x] 背景 ×2 → `backgrounds/`（A/B 各取 s303，格局符合門左/窗中/異常牆右）
- [x] 無對白代表卡 ×6 → `cards/`（a1_fuse s403、a2d_chain s404、a4_comfort s402、b1_glass v2 s413、b2n_hall s404、b6_open s402）
- [x] 分層來源包 ×2 → `layers/a1_fuse/`、`layers/b1_glass/`（bg/char綠幕/prop/fx 各 4 層）
- [x] UI 風格板 ×1 → `ui/ui-styleboard-v01.png`（品質偏弱，建議之後改用前端排版工具製作）
- [x] 色彩腳本 ×1 → `colorscript/color-script-v01.png`
- [ ] 3 秒動態測試 ×2 —— **待 Zhi 決定**：07 §0 寫影片交由使用者處理；分層包已備妥，可上 Wan I2V 或交人工

## Prompt 教訓（量產批次必須帶上）

1. 「divided by / both sides of the door」等措辭會誘發**分格漫畫構圖**——negative 必加 `split screen, comic panels, multiple panels`
2. 「water ripples」靠近牆的描述會把波紋畫到牆上變超自然漩渦——波紋必須綁定在容器內描述，negative 加 `spiral, vortex, glowing wall`
3. 道具（玻璃杯+錄音器）在人物手上的出現率低——**量產雙人/道具精準卡必須按 06 §6 上姿勢/深度控制**，純文字不穩
4. 同一 seed 跨角度可能膚色漂移（xu s101）——設定表允許跨 seed 混選
5. 兩位男角同用男漂泊者臉：Room A/B 不同房不衝突，但結局影片/第六房間卡若同框需先換掉其中一位

## 審核材料

- 全部候選對比圖在 `_review/`（每類 montage 含檔名標籤）
- 每張生成的完整 metadata JSON 與圖同資料夾

## 產出位置

`art/stylelock-placeholder-2026-07-17/`（characters/ busts/ backgrounds/ cards/ layers/ ui/ colorscript/）
每張圖旁存同名 .json metadata（prompt/seed/steps/cfg/sampler/model，依 06 §8）。

## 注意

- 本包全部是 placeholder 素材，不寫入 runtime manifest，asset-manifest 維持 greybox。
- 階段 1 不做成人內容（07 §階段1）。
- Gate：完成後交 Zhi 人工核准，未核准不進階段 2 量產。
