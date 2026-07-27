# 05｜輸出、命名與驗收

## 1. 交付目錄

```text
art/office-comic-2026-07-27/masters/
├─ characters/
├─ cards/
│  ├─ characters/
│  ├─ scenes/
│  └─ props/
├─ opening/
├─ endings/
│  ├─ perfect/
│  └─ side/
└─ ui/
```

所有檔名格式：

```text
{asset_id}.png
```

不要加入 `final`、`new`、日期、版本號、中文、空格或括號。修改版直接覆蓋
同一 asset ID，由 Git 保存版本歷史。

## 2. 尺寸表

| 類型 | 尺寸 | 背景 |
|---|---:|---|
| 角色設定表 | `2048 × 2048` | 不限 |
| 人物卡 | `1638 × 2048` | 透明 |
| 場景卡 | `2048 × 1536` | 不透明 |
| 道具卡 | `2048 × 2048` | 透明 |
| 固定首格 | `2560 × 1440` | 不透明 |
| 完美／支線第六格 | `1638 × 2048` | 不透明 |
| 完美／支線後續分格 | `2048 × 1536` | 不透明 |
| 紙張底紋 | `2048 × 2048` | 不透明、可平鋪 |
| 卡背／遮蔽格 | `1638 × 2048` | 不透明 |
| 18+ 背景 | `2560 × 1440` | 不透明 |
| 標題條 | `2048 × 512` | 透明 |

全部使用 sRGB PNG。透明背景必須是真 alpha，不接受白底或棋盤格畫進圖片。

## 3. 完整 87 份 asset ID

### 角色設定表：5

```text
char_jiang_boyu_sheet
char_tang_kexin_sheet
char_shen_yao_sheet
char_fang_manru_sheet
char_he_chengfeng_sheet
```

### 卡牌：13

```text
card_char_jiang_boyu
card_char_tang_kexin
card_char_shen_yao
card_char_fang_manru
card_char_he_chengfeng
card_scene_executive_corridor
card_scene_boss_office
card_scene_glass_meeting_room
card_scene_copy_archive_room
card_prop_master_keycard
card_prop_merger_contract
card_prop_blind_remote
card_prop_whisky_set
```

### 固定首格：1

```text
office_opening_01
```

### 完美路線：13

```text
ending_perfect_sixth
perfect_01
perfect_02
perfect_03
perfect_04
perfect_05
perfect_06
perfect_07
perfect_08
perfect_09
perfect_10
perfect_11
perfect_12
```

### 支線第六格：10

```text
side_jiang_boyu_tang_kexin_sixth
side_jiang_boyu_shen_yao_sixth
side_jiang_boyu_fang_manru_sixth
side_jiang_boyu_he_chengfeng_sixth
side_tang_kexin_shen_yao_sixth
side_tang_kexin_fang_manru_sixth
side_tang_kexin_he_chengfeng_sixth
side_shen_yao_fang_manru_sixth
side_shen_yao_he_chengfeng_sixth
side_fang_manru_he_chengfeng_sixth
```

### 支線後續：40

每個前綴都有 `_01`、`_02`、`_03`、`_04`：

```text
side_jiang_boyu_tang_kexin
side_jiang_boyu_shen_yao
side_jiang_boyu_fang_manru
side_jiang_boyu_he_chengfeng
side_tang_kexin_shen_yao
side_tang_kexin_fang_manru
side_tang_kexin_he_chengfeng
side_shen_yao_fang_manru
side_shen_yao_he_chengfeng
side_fang_manru_he_chengfeng
```

### UI：5

```text
ui_paper_texture
ui_card_back
ui_locked_panel
ui_age_gate_bg
ui_episode_title
```

總數驗算：

```text
5 + 13 + 1 + 13 + 10 + 40 + 5 = 87
```

## 4. 單張 QA

- [ ] 檔名與 asset ID 完全一致。
- [ ] 寬高與透明需求正確。
- [ ] sRGB，沒有 CMYK 偏色。
- [ ] 除角色設定表的開發註記外，沒有文字、對話框、擬聲字、Logo、浮水印或簽名。
- [ ] 臉、眼睛、手指、關鍵道具與成人姿勢沒有明顯生成錯誤。
- [ ] 重要內容位於中央 70%，四邊可安全裁切。
- [ ] 至少一個角落能放程式對話。
- [ ] 成人角色看起來明確成年。

## 5. 角色連續性 QA

- [ ] 五名角色都通過設定表後才批量生產漫畫。
- [ ] 髮型、髮色、眼睛、膚色、身高差與體型一致。
- [ ] 固定配件一致：唐可欣耳環、沈曜眼鏡、方曼如耳墜、賀承峰腕錶。
- [ ] 同一路線衣物狀態逐格變化，不跳接或復原。
- [ ] 同一路線背景家具、燈光方向與時間一致。
- [ ] 沒有多手、多指、融合肢體或不可能關節。

## 6. 成人內容 QA

- [ ] 畫面能辨認雙方清醒並主動回應。
- [ ] 不呈現恐懼、被迫、昏迷、醉倒或無法拒絕。
- [ ] 沒有未成年外觀、校園服裝或年齡含糊元素。
- [ ] 同性配對與異性配對使用相同完成標準。
- [ ] 不含暴力、流血、排泄、獵奇傷害或真實人物肖像。
- [ ] 不模仿受保護遊戲、動畫或漫畫角色。

## 7. 回交方式

每次可回交任意完整小批，但請保持目錄與 asset ID。Codex 收到後負責：

1. 自動檢查尺寸、alpha、檔名與缺件。
2. 產生 runtime WebP 與縮圖。
3. 更新 asset manifest。
4. 接入灰階版本正在使用的相同 ID。
5. 執行 `npm --prefix prototype-web run check`。
6. 部署精確 commit 到 GitHub 預覽後再交人工 QA。
