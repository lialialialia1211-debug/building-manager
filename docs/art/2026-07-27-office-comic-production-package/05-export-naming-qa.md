# 05｜輸出、命名與內容驗收

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

不要加 `final`、`new`、日期、版本號、中文、空格或括號。

## 2. 技術畫布

這些只為程式裁切與顯示，不限制畫風：

| 類型 | 建議畫布 | 背景 |
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

若美術工作流需要其他解析度，可以等比例放大；長寬比不要改。全部使用
sRGB PNG。透明背景必須是真 alpha。

## 3. 完整 87 份 asset ID

### 角色設定表：5

```text
char_male_rover_sheet
char_female_rover_sheet
char_xiangli_yao_sheet
char_changli_sheet
char_boss_mingshi_sheet
```

### 卡牌：13

```text
card_char_male_rover
card_char_female_rover
card_char_xiangli_yao
card_char_changli
card_char_boss_mingshi
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
side_male_rover_female_rover_sixth
side_male_rover_xiangli_yao_sixth
side_male_rover_changli_sixth
side_male_rover_boss_mingshi_sixth
side_female_rover_xiangli_yao_sixth
side_female_rover_changli_sixth
side_female_rover_boss_mingshi_sixth
side_xiangli_yao_changli_sixth
side_xiangli_yao_boss_mingshi_sixth
side_changli_boss_mingshi_sixth
```

### 支線後續：40

```text
side_male_rover_female_rover_01
side_male_rover_female_rover_02
side_male_rover_female_rover_03
side_male_rover_female_rover_04
side_male_rover_xiangli_yao_01
side_male_rover_xiangli_yao_02
side_male_rover_xiangli_yao_03
side_male_rover_xiangli_yao_04
side_male_rover_changli_01
side_male_rover_changli_02
side_male_rover_changli_03
side_male_rover_changli_04
side_male_rover_boss_mingshi_01
side_male_rover_boss_mingshi_02
side_male_rover_boss_mingshi_03
side_male_rover_boss_mingshi_04
side_female_rover_xiangli_yao_01
side_female_rover_xiangli_yao_02
side_female_rover_xiangli_yao_03
side_female_rover_xiangli_yao_04
side_female_rover_changli_01
side_female_rover_changli_02
side_female_rover_changli_03
side_female_rover_changli_04
side_female_rover_boss_mingshi_01
side_female_rover_boss_mingshi_02
side_female_rover_boss_mingshi_03
side_female_rover_boss_mingshi_04
side_xiangli_yao_changli_01
side_xiangli_yao_changli_02
side_xiangli_yao_changli_03
side_xiangli_yao_changli_04
side_xiangli_yao_boss_mingshi_01
side_xiangli_yao_boss_mingshi_02
side_xiangli_yao_boss_mingshi_03
side_xiangli_yao_boss_mingshi_04
side_changli_boss_mingshi_01
side_changli_boss_mingshi_02
side_changli_boss_mingshi_03
side_changli_boss_mingshi_04
```

### UI：5

```text
ui_paper_texture
ui_card_back
ui_locked_panel
ui_age_gate_bg
ui_episode_title
```

總數：

```text
5 + 13 + 1 + 13 + 10 + 40 + 5 = 87
```

## 4. 單張內容 QA

- [ ] Asset ID 與檔名正確。
- [ ] 畫面符合 `02`、`03` 或 `04` 指定的姿勢與動作。
- [ ] 角色視線、表情與對話情緒相符。
- [ ] 主要角色、手部、道具與成人姿勢能讀懂。
- [ ] 有足夠低細節空間放指定對話。
- [ ] 圖內沒有畫死中文、氣泡、旁白、Logo、浮水印或簽名。
- [ ] 角色看起來明確成年。

## 5. 漫畫連續性 QA

- [ ] 同一路線角色造型與身體特徵一致。
- [ ] 地點、家具與光線方向接續。
- [ ] 衣物狀態逐格變化，不突然脫光或穿回。
- [ ] `02` 的姿勢能合理接到 `03`。
- [ ] `04` 保留剛結束的痕跡，但已回到辦公室笑點。
- [ ] 沒有多手、多指、融合肢體或不可能關節。

## 6. 對話驗收

美術不必把文字畫進圖，但應用文件中的台詞檢查構圖：

- [ ] 說話者的嘴型、視線與情緒合理。
- [ ] 第一個氣泡位置不會蓋住另一人的臉。
- [ ] 擬聲字位置不遮擋主要動作。
- [ ] 最多三個氣泡都能按順序放入。
- [ ] 反向人物順序仍可共用同一張圖。

## 7. 回交後由 Codex 處理

1. 檢查尺寸、alpha、檔名與缺件。
2. 產生 WebP 與縮圖。
3. 更新 asset manifest。
4. 寫入 `03`、`04`、`06` 的對話資料。
5. 執行 `npm --prefix prototype-web run check`。
6. 部署精確 commit 到 GitHub 預覽後再開始人工 QA。
