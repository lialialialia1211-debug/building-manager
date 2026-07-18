# 原生風格重製版（Anima native / 千咲同款 prompt 格式）

- 日期：2026-07-18
- Zhi 指令：取消全部風格規格，只保留姿勢/構圖/NSFW 內容；風格對齊千咲那批
- 批次：80 張全數成功（refs 32、busts 8、bg 4、代表卡 12、成人關鍵幀 24）
- 風格驗證樣張：`D:/AI/ComfyUI/output/nativestyle/samples/`（sample-a_adult_05 為基準）

## Prompt 格式定案（與 stylelock 版的差異）

- danbooru tag 開頭（`changli (wuthering waves), ...`），服裝用短句
- 移除：所有 style block、色彩腳本、quality block、年齡/身高/mature 語言、`young-looking face` negative
- negative 用 Anima 標準組（worst quality/score_1-3/sepia）＋防分格＋內容紅線（child/無強迫/無醉態）
- 雙人場景加「one single continuous scene in one unified room」

## 建議選圖（待 Zhi 確認）

| 資產 | 建議 seed | 備註 |
|---|---|---|
| card-a1_fuse | s432 | 光線最好 |
| card-a2d_chain | s432 | 門鏈跨門、單一場景 |
| card-a4_comfort | s432 | 無分格、動作可讀 |
| card-b1_glass | — | **兩個 seed 都出現超大玻璃杯前景，需重跑或改用姿勢控制** |
| card-b2n_hall | s431 | 捲尺線清楚 |
| card-b6_open | — | **開牆動作弱，建議重跑強化「推開牆板」描述** |
| a_adult_01–06 | 01:s821 / 02:s821 / 03:s822 / 04:s821 / 05:s822 / 06:s822 | 全序列成立 |
| b_adult_01–06 | 01:s822 / 02:s821 / 03:s822 / 04:s822 / 05:s822 / 06:s821 | 見下方問題 |

## 已知問題

1. `b1_glass`、`b6_open` 兩張卡動作/道具不穩——量產時這類「道具精準卡」建議上 Anima LLLite 姿勢控制，純文字上限就在這
2. B 房成人序列 Xu 的髮色在部分幀漂向深色（散華的灰髮＋異色瞳是小特徵、容易掉）——正式量產前建議為兩位女角各訓一顆輕量 LoRA 錨定
3. `b_adult_05` 側躺姿勢有幀跑成男上位——側躺面對面是低頻姿勢、tag 支撐弱，同樣是姿勢控制的活
4. 兩位男角同臉（男漂泊者）——placeholder 階段接受

## 檔案

- 審圖 montage：`_review/`（cards、adult-room_a、adult-room_b、四角色、backgrounds）
- 原檔：`D:/AI/ComfyUI/output/nativestyle/`；metadata JSON 在本資料夾各分類底下
- 成人素材隔離於 `adult/room_a/`、`adult/room_b/`
