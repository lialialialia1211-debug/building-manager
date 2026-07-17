# Room B〈牆後的聲音〉候選卡

## 1. 發牌與結局契約

- 房間：`room_b_wall`
- 候選總數：24
- 每局發牌：12
- 玩家選擇：6，可自由排列
- 必發卡：`b6_open`、`b4_comfort`、`b6_consent`
- 親密結局：選到 `b6_consent`、`intimacy >= 3`、`trust >= 1`
- 主線結局：選到 `b6_open`、`trust >= 1`
- 其他組合：普通結局

本表保留現有 ID、數值與旗標；完整對白需在後續內容同步計畫中寫回 `content/rooms/room_b_wall.json`。

## 2. Room Block

每張 Room B 圖都在完整 prompt 中加入：

```text
Inside a fictional low-magic urban apartment at night. The fixed room layout has
the abnormal shared wall on frame right, the entrance on frame left, a sound-editing
desk and sofa in the center, and a short hallway visible through the door.
Cool moonlit teal, muted gray-violet surfaces, controlled green recorder lights,
and a dim abnormal yellow glow behind the wall. Clean cel animation,
consistent room geometry, no readable text or waveform labels.
```

## 3. 24 張卡片表

### 3.1 聲音與證據

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `b1_glass` 貼近玻璃 | 水面出現六拍波紋，回聲位置比實際牆面更深 | 安寧側身貼牆，一手扶杯、一手控制錄音器；Hero 側面中近景 | trust `+1`；flag `b_sound_located` |
| `b2g_mark` 查看牆上痕跡 | 不同日期的膠帶標記每天向中央移動，像房間正在靠近 | 安寧站牆側，以筆比對六個標記；牆面正視圖 | flag `b_wall_mark` |
| `b2g_record` 錄下聲音 | 雙軌錄音顯示敲擊總比實際聲音提早四分鐘出現在檔案中 | 安寧坐工作桌操作錄音器，周衍後景保持安靜；Hero 中景 | trust `+1`；flag `b_sound_recorded` |
| `b2k_pattern` 數清敲擊節奏 | 六拍節奏與大樓夜間照明的閃爍完全同步 | 安寧記錄節拍，另一手示意安靜；俯側構圖 | trust `+1` |
| `b3_blueprint` 展開藍圖 | 圖紙與現場尺寸相比，兩戶之間少了九十二公分 | 兩人各壓住圖紙一角，手不遮比例；桌面俯拍 | flag `b_blueprint_gap` |
| `b5_record` 保存錄音 | 安寧從雜訊分離出前任管理員的警告聲，但缺少最後一句 | 耳機、錄音器與兩條波形佔前景；雙人肩部特寫 | flag `b_evidence` |

### 3.2 試探與安全

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `b1_knock` 敲擊牆面 | 安寧敲三下，牆後回應六下；最後一下在她落指前先響起 | 一手懸牆前、另一手按錄音器；手部側面特寫 | trust `+1` |
| `b2g_cover` 蓋住玻璃杯 | 隔離玻璃與空氣聲後，錄音器仍收到牆內低頻 | 安寧以厚布包杯，耳機滑至頸側；桌面中近景 | — |
| `b2k_reply` 回敲牆面 | 她以六拍回覆，牆紙接縫隨節奏向外鼓起 | 安寧用開放手掌輕拍，周衍在門口計時；側面全身景 | flag `b_reply` |
| `b2k_stop` 停下聆聽 | 所有設備關閉後，牆內仍傳出拖動房間的摩擦聲 | 安寧坐房間中央，周衍停門外；大量留白廣角 | — |
| `b4_leave` 離開房間 | 兩人撤到走廊，封住門與牆縫，異常沒有跨出房間 | 安寧貼防拆封條，周衍記錄時間；走廊長透視 | — |
| `b6_sleep` 關燈休息 | 敲擊在清晨前停止，黃色微光停留在牆內固定位置 | 安寧坐沙發、周衍坐門邊椅子；雙人廣角 | — |

### 3.3 合作與界線

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `b1_neighbor` 前往隔壁 | 兩人從各自門口確認聲音不屬於任一房，中央牆比圖紙更寬 | 兩人分站兩扇門前，空白牆居中；對稱廣角 | affection `+1`、trust `+1` |
| `b2n_invite` 邀請對方進門 | 安寧說明進房規則，周衍等待點頭後才跨門檻 | 安寧讓出通道並指向工具位置，周衍停門外；中景 | affection `+1` |
| `b2n_hall` 走到走廊 | 捲尺與雷射都顯示走廊正確，消失的九十二公分只存在牆內 | 兩人分站走廊兩端拉尺；高角度長透視 | trust `+1` |
| `b2n_refuse` 關上房門 | 安寧拒絕進入；周衍後退並留下草圖，但失去合作時機 | 安寧在安全鏈內關門，周衍雙手可見地退開 | trust `-1` |
| `b3_share` 交換發現 | 聲音檔與尺寸草圖指向同一空間 | 安寧遞耳機，周衍推草圖至中央；雙人桌邊中景 | trust `+1` |
| `b3_music` 播放音樂 | 牆後聲音先模仿節拍，再故意加入第六拍 | 安寧控制播放器，周衍觀察水面；生活感廣角 | affection `+1` |

### 3.4 決斷與結局導向

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `b4_measure` 測量牆面 | 掃描顯示狹長空間正在牆內緩慢位移 | 周衍低身移動掃描器，安寧貼標記；Hero 側面 | trust `+1`；flag `b_hidden_space` |
| `b4_comfort` 靠近坐下 | 安寧聽見陌生記憶；周衍取得同意後才坐近 | 安寧摘耳機坐沙發邊，周衍由另一張椅子移近 | trust `+1`、intimacy `+1`；必發 |
| `b5_ask` 開口詢問 | 周衍坦白曾在另一棟樓測到相同空間缺口 | 安寧直視提問，周衍放下工具回答；正面雙人鏡頭 | trust `+1`、intimacy `+1` |
| `b5_ignore` 收起筆記 | 安寧暫停調查，周衍離開；牆後聲音變成與她心跳相同 | 安寧背向收資料，周衍走向門口；深景構圖 | trust `-1` |
| `b6_open` 推開暗門 | 完成安全確認後，兩人推開牆縫，看見移動的第六房間外壁 | 兩人並肩但不跨入，共同推牆；Hero 廣角 | trust `+1`；flag `b_opened_space`；必發 |
| `b6_consent` 牽住對方的手 | 危機穩定後，安寧主動表達感情；周衍確認後回握 | 兩人站在封牆與出口間，牽手居中 | intimacy `+2`；flag `b_consent`；必發 |

## 4. English Scene Prompt Blocks

使用方式：`STYLE BLOCK + CHARACTER BLOCK(S) + ROOM B BLOCK + SCENE BLOCK + NEGATIVE BLOCK`。

### 聲音與證據

```text
[b1_glass] Hero side medium-close shot. Xu presses a thick clear glass against the abnormal wall and listens with one ear while her other hand controls a dual-track recorder. Water inside the glass forms six distinct ripples. Her adult face, both hands, the glass, and the wall seam are clearly readable.

[b2g_mark] Straight-on wall composition. Removable tape marks from different nights and heights converge toward one empty section. Xu stands to one side with a pen and notebook, never blocking the marks or wallpaper seam. The shifted pattern communicates movement without readable dates.

[b2g_record] Hero recording-desk shot. Xu operates a dual-track recorder with one microphone against the wall and one collecting room ambience. Six green pulses appear earlier on one abstract waveform while Zhou remains silent in the distant background. Generate no text or numeric labels.

[b2k_pattern] High three-quarter rhythm-analysis composition. Xu records six beats using simple non-text marks on paper while the recorder pulse light synchronizes. Fine dust falls from the wall at different strengths. Her raised free hand asks for silence.

[b3_blueprint] Direct overhead evidence shot. Xu and Zhou each hold one corner of an original building plan and a separate field measurement sketch. A clearly visible empty strip exists between two apartments. Their hands do not cover the scale or the geometric gap; generate no readable annotations.

[b5_record] Tight shoulder-and-equipment composition. Xu isolates one recording track while Zhou points only to a separate copied segment. Large headphones, recorder controls, and two abstract pulse lines occupy the foreground. Their adult expressions show recognition of an incomplete warning.
```

### 試探與安全

```text
[b1_knock] Side hand close-up. Xu raises one hand and taps the wall gently with her knuckles while her other hand rests near the recorder. A small dust response appears at a point offset to the right. Her fingers are anatomically clear and the motion is controlled, not violent.

[b2g_cover] Table medium-close shot. Xu wraps the listening glass in thick cloth and moves it away from the wall while the recorder continues showing one dim green pulse. Her headphones rest around her neck; the still water and separated objects communicate acoustic isolation.

[b2k_reply] Full-body side shot. Xu answers with six controlled open-palm taps while Zhou times the test from the entrance. The wallpaper seam expands outward by only a few millimeters. A marked retreat line and safe distance remain visible.

[b2k_stop] Extremely quiet wide shot with large negative space. Xu has shut down every device and sits at the center of the room; Zhou remains outside the open doorway. Only a tiny recorder standby light and a trace of falling dust indicate continuing internal friction.

[b4_leave] Long-perspective hallway shot. Xu locks the apartment and applies tamper tape while Zhou records the time on a device with no readable screen. Their equipment is packed; the abnormal wall remains visible only through a narrowing doorway shadow.

[b6_sleep] Pre-dawn wide interior. Xu rests on the sofa away from the wall while Zhou sits in a separate chair near the entrance. Recorder lights are off, tape remains intact, and a stationary muted-yellow glow rests behind the wall. Each adult keeps an independent resting space.
```

### 合作與界線

```text
[b1_neighbor] Symmetrical hallway wide shot. Xu and Zhou stand at their separate apartment doors with the unnaturally wide blank wall centered between them. Neither approaches the other. Cold emergency light creates a long shadow that reveals the excess wall thickness.

[b2n_invite] Entrance medium shot. Xu voluntarily clears a path and points to a safe place for Zhou's hard equipment case. Zhou waits outside the threshold with open hands and enters only after her visible nod. The wall and exit remain in view.

[b2n_hall] High-angle long-perspective hallway composition. Xu and Zhou stand near opposite apartment doors using a tape measure and two simple laser points. An impossible doorless width lies between them. Their positions and measurement direction remain easy to read.

[b2n_refuse] Two-sided doorway shot through a retained safety chain. Xu begins closing the door from inside while Zhou steps back outside with visible hands. He leaves a measurement sketch on the floor within her reach. The refusal is respected and not portrayed as punishment.

[b3_share] Two-character table medium shot. Xu offers one side of a spare headphone set while keeping the original recorder. Zhou pushes a copied measurement sketch to the center while retaining his field notes. Audio pulses and geometry form complementary evidence without readable text.

[b3_music] Briefly warmer wide shot. Xu controls a small speaker playing a simple beat while Zhou observes the wall and the glass. The water ripples imitate the pattern and then add a sixth pulse. The scene feels momentarily domestic without losing the mystery.
```

### 決斷與結局導向

```text
[b4_measure] Hero layered side composition. Zhou moves a non-destructive wall scanner across a removable tape grid while Xu marks confirmed points. The abstract display indicates a moving hollow outline and two vertical edges with no readable numbers. Equipment use is professional and safe.

[b4_comfort] Medium two-character sofa shot. Xu removes her headphones and sits at the sofa edge after hearing an alien memory. Zhou first pauses beside a separate chair with an open asking gesture, then begins moving closer only after her visible consent. The abnormal wall and exit remain visible.

[b5_ask] Frontal two-character dialogue shot. Xu looks directly at Zhou and asks for the truth. Zhou has set every tool down and answers from a clear distance. Two separate evidence folders on the table symbolize that investigation and emotion are being discussed openly.

[b5_ignore] Deep-focus back-facing composition. Xu turns off the recorder and closes her notes while Zhou stands to leave. The wall tape remains intact; one dim pulse matches her heartbeat. The image communicates postponement and boundaries rather than denial of the anomaly.

[b6_open] Hero wide opening shot. After power isolation, ventilation, and structural bracing, Xu and Zhou jointly push an existing narrow wall panel open only to observation width. A moving corridor, six-cell emblem, low-power lines, and distant yellow light appear beyond. Both stay outside the threshold.

[b6_consent] Safe intimacy-confirmation hero shot. Two clearly adult characters stand between the fully sealed wall and a visible exit after all equipment is packed. Xu voluntarily reaches for Zhou's hand; Zhou makes eye contact and returns the gesture only after her response. Adult faces and both hands remain visible.
```

## 5. Room B 可讀性檢查

- `貼近玻璃`、`敲擊牆面`、`回敲牆面` 必須由玻璃、指節／手掌及人物距離明確區分。
- `錄下聲音`、`數清敲擊節奏`、`保存錄音` 分別表現錄製、分析、保存證據。
- `前往隔壁`、`邀請對方進門`、`關上房門` 不能使用相同門口構圖。
- `測量牆面` 與 `推開暗門` 必須一眼區分非破壞掃描及實際開啟。
- `靠近坐下` 與 `牽住對方的手` 分別表現安撫及明確關係確認。
- 所有 scene blocks 均為候選圖，不生成對白或成人內容。
