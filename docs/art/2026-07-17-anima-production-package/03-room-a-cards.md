# Room A〈停電之夜〉候選卡

## 1. 發牌與結局契約

- 房間：`room_a_blackout`
- 候選總數：24
- 每局發牌：12
- 玩家選擇：6，可自由排列
- 必發卡：`a6_report`、`a4_comfort`、`a6_consent`
- 親密結局：選到 `a6_consent`、`intimacy >= 3`、`trust >= 1`
- 主線結局：選到 `a6_report`、`trust >= 1`
- 其他組合：普通結局

本表保留現有 ID、數值與旗標；完整對白需在後續內容同步計畫中寫回 `content/rooms/room_a_blackout.json`。

## 2. Room Block

每張 Room A 圖都在完整 prompt 中加入：

```text
Inside a fictional low-magic urban apartment during a total blackout.
The room has a fixed layout: entrance door on frame left, living area and window
in the center, electrical panel on the right wall. Cold blue ambient darkness,
controlled amber candlelight, a small red warning point, and an abnormal muted
yellow six-grid glow. Clean cel animation, consistent room geometry, no readable text.
```

## 3. 24 張卡片表

### 3.1 異常與證據

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `a1_fuse` 檢查配電箱 | 所有開關都在 ON，箱體深處卻有一個按六拍明滅的黃色接點 | 雨薇單膝蹲下，左手持燈、右手停在開關前；低角度中近景 | flag `a_checked_fuse` |
| `a1_note` 拾起紙條 | 紙條警告不要讓第六格亮起，背面有隨體溫浮現的平面圖 | 雨薇蹲在燭光旁，以兩指夾住紙角；俯拍 | flag `a_found_note` |
| `a2n_follow` 沿著記號查看 | 牆角粉末形成路徑，終點是兩戶間不存在於圖紙上的空間 | 雨薇持燈沿踢腳板前進；長透視側拍 | flag `a_symbol_seen` |
| `a2n_photo` 拍下紙條 | 不同曝光讓導電墨浮現，六格圖形像正在改寫房間比例 | 手機佔前景，雨薇固定紙條、皓然補斜光；微距 | flag `a_note_saved` |
| `a3_trace` 描摹符號 | 描圖與房屋平面重疊後，多出一個被刪除的房間 | 雨薇伏桌描線，皓然站側後方持燈；Hero 俯側視角 | flag `a_symbol_traced` |
| `a5_photo` 查看照片 | 配線照片、紙條和牆角記號都指向相同座標 | 兩人分站桌子兩側，各指向一份證據；正上方俯拍 | flag `a_evidence` |

### 3.2 安全與界線

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `a1_door` 查看門口 | 雨薇確認來者是皓然；他的工具箱封條也印著六格符號 | 雨薇側身藏在門後，一手扣門鏈、一手持燈；門縫視角 | trust `+1` |
| `a2d_chain` 扣上門鏈 | 雨薇隔門詢問；皓然放下工具並後退，完整回答來意 | 門鏈橫切雙人特寫，雙手都保持可見 | trust `+1` |
| `a2f_reset` 重設開關 | 正常總開關立刻彈回，黃色接點卻變亮；雨薇停止操作 | 絕緣工具與開關的手部特寫 | — |
| `a2f_call` 撥打電話 | 緊急服務只回傳六拍雜訊；外界同樣收不到大樓訊號 | 雨薇聽擴音，皓然翻查紙本聯絡冊；雙人中景 | affection `+1` |
| `a2n_wait` 留在原地 | 停止刺激迴路後，黃色接點仍按兩人的呼吸節奏明滅 | 雨薇坐桌邊、皓然留門口；對稱廣角 | — |
| `a4_sleep` 關燈休息 | 兩人輪流守夜；第六格微光在牆後緩慢移動 | 雨薇蜷坐沙發、皓然坐門邊地板；安靜廣角 | — |

### 3.3 合作與關係

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `a2d_open` 打開房門 | 雨薇核對封條後讓皓然進門；工具留在可見位置 | 雨薇站門側保留退路，皓然停門檻外；全身中景 | affection `+1` |
| `a2d_listen` 靠近聆聽 | 兩人在門板兩側同時聽見六拍低鳴，證明異常不是幻覺 | 雨薇耳貼門、手握門鏈；皓然在另一側俯身 | trust `+2` |
| `a2f_tools` 取出工具 | 第二層外蓋後出現正在輕微搏動的黑色細線 | 皓然半蹲操作，雨薇站側面持燈錄影；Hero 中景 | trust `+1`；flag `a_hidden_circuit` |
| `a3_share` 分享發現 | 雨薇把紙條和照片推到中央，兩人決定只製作副本 | 雙人俯身但保留桌面界線；中景 | trust `+1` |
| `a3_candle` 點亮蠟燭 | 皓然坦白童年時也看過不存在的黃色窗格 | 兩人分坐桌子兩側，燭火置中；平視廣角 | affection `+1` |
| `a4_ground` 檢查地面 | 測試器在牆角發出六拍回應，金屬粉顯示空間曾從地板下經過 | 皓然低身掃描，雨薇持燈；地面近景 | trust `+1` |

### 3.4 決斷與結局導向

| ID／選項 | 揭曉事件 | 姿勢與鏡頭 | Runtime |
|---|---|---|---|
| `a4_comfort` 坐到身旁 | 雨薇看見陌生記憶；皓然詢問並得到點頭後才坐近 | 雨薇坐沙發邊，皓然由一臂距離移近；雙人中景 | affection `+1`、trust `+1`、intimacy `+1`；必發 |
| `a5_ask` 開口詢問 | 皓然承認前任管理員失蹤前曾向他求助 | 雨薇坐直正視，皓然放下工具坦白；正面雙人鏡頭 | trust `+1`、intimacy `+1` |
| `a5_ignore` 轉身離開 | 雨薇暫不相信他，把證據收起；微光在兩人間熄滅 | 雨薇背向窗邊，皓然退回門口；深景構圖 | trust `-1` |
| `a6_report` 整理紀錄 | 兩人整理證據並傳給管理室，建立第六房間檔案 | 桌面俯拍結合兩人肩部，證據排列清楚 | trust `+1`；flag `a_reported`；必發 |
| `a6_consent` 伸出手 | 危機穩定後，雨薇主動表明感情；皓然確認後才回握 | 面對面坐著，雙手置中，出口可見 | intimacy `+2`；flag `a_consent`；必發 |
| `a6_morning` 拉開窗簾 | 清晨倒影中短暫出現第六扇黃色窗戶 | 雨薇站窗邊拉簾，皓然坐後景；室內廣角 | — |

## 4. English Scene Prompt Blocks

使用方式：`STYLE BLOCK + CHARACTER BLOCK(S) + ROOM A BLOCK + SCENE BLOCK + NEGATIVE BLOCK`。

### 異常與證據

```text
[a1_fuse] Low-angle medium shot. Lin kneels on one knee before the open electrical panel, holding a narrow flashlight in her left hand while her right hand stops safely before the switches. Every normal switch is on; a hidden muted-yellow contact pulses behind the panel in a six-beat rhythm. The red warning point and both hands are clearly readable.

[a1_note] High-angle close shot. Lin crouches beside one controlled candle and holds the edge of a folded note with two fingers. Heat reveals a faint geometric floor-plan impression on the back without any readable writing. The paper, copper dust, and her cautious adult expression are the visual focus.

[a2n_follow] Long-perspective side shot. Lin follows a thin trail of pale mineral dust along the baseboard with her flashlight. The trail continues beneath the entrance and points toward an abnormally thick blank wall between apartments. Her walking direction, the light beam, and the destination form one clear line.

[a2n_photo] Macro composition with a smartphone camera occupying the foreground. Lin holds the note without touching its surface while Chen changes the angle of a second light from the background. Blue reflective conductive ink reveals a six-cell symbol, with no readable UI or text.

[a3_trace] Hero high three-quarter view over the table. Lin traces a six-cell symbol onto transparent paper while Chen holds a low raking light. The tracing overlaps a simplified apartment plan and exposes one impossible missing room. Hands and evidence remain unobstructed.

[a5_photo] Direct overhead evidence shot. Lin and Chen stand on opposite sides of the table, each pointing to separate material: wiring photograph, transparent tracing, and wall-route image. All three converge on one empty coordinate; no fingers cover the important geometry.
```

### 安全與界線

```text
[a1_door] Medium shot from inside the apartment through a chained door opening. Lin keeps her body behind the door, one hand on the chain and one holding a flashlight. Chen remains outside with both hands visible beside a sealed rectangular toolbox carrying a small six-cell emblem.

[a2d_chain] Tight two-character shot divided by the horizontal door chain. Lin watches from the interior; Chen has placed his toolbox on the floor and stepped back with open hands. Flashlight light crosses both adult faces while preserving the physical boundary.

[a2f_reset] Extreme hand close-up. Lin uses an insulated tool to move the correctly labeled main switch. It snaps back while an unlabeled muted-yellow point grows brighter. Her bare hand stays away from exposed wiring; her face appears only as a controlled reflection.

[a2f_call] Medium two-character shot. Lin listens to a phone on speaker between the electrical panel and window while Chen checks a paper contact directory at a respectful distance. Six rhythmic indicator pulses reflect across their faces; the phone screen contains no readable text.

[a2n_wait] Symmetrical wide shot. Lin sits at the table and Chen remains near the entrance, each beside a separate candle. The hidden yellow contact pulses in time with their breathing. The distance and waiting posture communicate observation rather than inactivity.

[a4_sleep] Quiet wide night composition. Lin rests awake on the sofa while Chen sits on the floor near the entrance, keeping watch. The candle is safely extinguished, tools are closed, and a faint six-cell yellow glow appears to move behind the wall.
```

### 合作與關係

```text
[a2d_open] Full-body medium shot at the entrance. Lin stands to the side with a clear retreat path after releasing the chain. Chen waits outside the threshold and raises the sealed toolbox for inspection before entering. Their distance and positions communicate voluntary access.

[a2d_listen] Layered side view of both sides of the closed door. Lin presses one ear to the interior while still holding the chain; Chen bends toward the exterior panel without touching it. Six dim sections inside the frame pulse as both hear the same sound.

[a2f_tools] Hero medium shot. Chen kneels at the opened second layer of the electrical panel using insulated tools. Lin stands beside him, holding a flashlight and recording with her phone. A thin black filament passes behind official wiring and enters the wall, marked by a six-cell metal stamp.

[a3_share] Two-character table-side medium shot. Lin pushes the note, photographs, and route sketch to the center without surrendering the originals. Chen leans in to inspect but does not take them. Their gazes converge on evidence while the table preserves a visible boundary.

[a3_candle] Warm wide shot across the table. Lin and Chen sit on opposite sides of one candle. Scratches on the wall cast a six-cell shadow while the cold red panel light stays in the background. Expressions soften from alarm to honest conversation.

[a4_ground] Low floor-level close shot. Chen scans grounding and a hidden baseboard channel with a non-contact tester while Lin supplies light. Fine metal dust, a cut piece of insulation, and a route beneath the floor are visible without unsafe bare-hand contact.
```

### 決斷與結局導向

```text
[a4_comfort] Medium two-character sofa shot. Lin sits at the edge recovering from a memory flash. Chen first pauses one arm-length away with an open asking gesture, then begins to sit closer only after her visible nod. Both hands, expressions, and exit path remain clear.

[a5_ask] Frontal two-character dialogue shot. Lin sits upright and directly questions Chen. He has placed all tools down and answers from a respectful distance. The evidence table and two separate water cups indicate cooperation without forced intimacy.

[a5_ignore] Deep-focus back-facing composition. Lin closes the evidence inside a folder and walks toward the window. Chen withdraws into the entrance shadow. Their gazes no longer meet; the yellow glow between them fades without portraying punishment.

[a6_report] Hero overhead table and shoulder composition. Lin and Chen arrange photographs, tracing, audio pulses, and wiring diagrams into a chronological evidence package and make a duplicate. A management terminal can be added later as UI; generate no readable title or screen text.

[a6_consent] Safe intimacy-confirmation hero shot. Two clearly adult characters sit face-to-face after every tool and hazard is secured. Lin voluntarily extends her hand while maintaining space; Chen makes eye contact and begins to return the gesture only after her response. Hands, adult faces, and a clear exit remain visible.

[a6_morning] Morning wide shot from inside the living room. Lin opens the curtains while Chen sits near the table or entrance. Cool dawn replaces the red warning light; the electrical seal is intact. A narrow impossible yellow window appears only as a subtle reflection across the street.
```

## 5. Room A 可讀性檢查

- `查看門口`、`扣上門鏈`、`打開房門` 必須分別呈現觀察、維持界線、允許進入三種剪影。
- `檢查配電箱`、`重設開關`、`取出工具` 必須分別呈現觀察、單一安全操作、雙人拆檢。
- `拾起紙條`、`拍下紙條`、`描摹符號`、`查看照片` 必須靠紙張位置與手勢區分。
- `坐到身旁` 與 `伸出手` 不得使用相同構圖；前者是距離縮短，後者是明確關係確認。
- 所有 scene blocks 均為候選圖，不生成對白或成人內容。
