# Anima／ComfyUI 工作流

## 1. 官方基線

截至 2026-07-17，本包正式圖基準為 [`anima-aesthetic-v1.1.safetensors`](https://huggingface.co/circlestone-labs/Anima/blob/main/split_files/diffusion_models/anima-aesthetic-v1.1.safetensors)。Anima 是 CircleStone Labs 與 Comfy Org 合作的 2B 插畫／動漫 text-to-image 模型，原生支援 ComfyUI，不以照片寫實為主要目標。

官方資源：

- [Anima model card](https://huggingface.co/circlestone-labs/Anima/blob/main/README.md)
- [Comfy Org Anima Base workflow](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_anima_base_v1.json)
- [Anima Aesthetic v1.1 模型檔](https://huggingface.co/circlestone-labs/Anima/blob/main/split_files/diffusion_models/anima-aesthetic-v1.1.safetensors)
- [Anima LLLite ControlNet 節點](https://github.com/kohya-ss/ComfyUI-Anima-LLLite)

官方基礎檔案位置：

```text
ComfyUI/models/diffusion_models/anima-aesthetic-v1.1.safetensors
ComfyUI/models/text_encoders/qwen_3_06b_base.safetensors
ComfyUI/models/vae/qwen_image_vae.safetensors
```

官方 workflow 目前示範 `anima-base-v1.0.safetensors`；正式生產時只替換 UNET／diffusion model 為 Aesthetic v1.1，Text Encoder 與 VAE 維持上述配置。

## 2. 兩個生成 Profile

### 2.1 草稿 Profile

| 欄位 | 值 |
|---|---|
| 模型 | Anima Turbo v1.0 |
| 尺寸 | 1024×576 或 1344×768 |
| Steps | 8–12 |
| CFG | 1 |
| Sampler | `euler` 起步 |
| 用途 | 姿勢、鏡位、角色左右位置、牌池可讀性比較 |

草稿只決定構圖，不作正式角色一致性驗收。

### 2.2 正式 Profile

| 欄位 | 值 |
|---|---|
| 模型 | Anima Aesthetic v1.1 |
| 尺寸 | 1536×864 |
| Steps | 36 起步；允許 30–40 範圍測試 |
| CFG | 4.5 起步；允許 4–5 範圍 |
| Sampler | `er_sde` |
| Scheduler | `simple` 起步 |
| Batch | 同一構圖先出 4 個 seed，再選 1 個進修整 |
| 輸出 | 無損 PNG 工作檔；核准後轉 2560×1440 WebP |

官方說明的一般 Anima 建議範圍是 512² 至 1536²、30–50 steps、CFG 4–5；`er_sde` 適合較中性的平塗與清楚線條。

## 3. Prompt 組裝順序

> **2026-07-18 改版（Zhi 拍板，取代原 QUALITY/STYLE BLOCK 制）**：實測證明原 STYLE BLOCK（anime screenshot/cel tags）與角色 block 的年齡/身高/mature 語言會把畫面推向 TV 截圖感與寫實感。新制如下：

```text
SAFETY + 人數 tag（safe / sensitive / nsfw / explicit, 1girl, 1boy...）
CHARACTER BLOCK（danbooru tag 開頭 + 服裝短句；禁age/height/mature字眼）
ROOM BLOCK（只寫幾何格局與光源，不掛色彩腳本 tag）
SCENE BLOCK（姿勢與構圖，維持不變）
單場景鎖詞：One single continuous scene in one unified room.（雙人必加，防分格）
no text
```

- **不掛任何 quality/style tag**，風格交給 Anima Aesthetic 預設。
- Negative 統一用：`worst quality, low quality, score_1, score_2, score_3, blurry, jpeg artifacts, sepia, artist name, text, watermark, extra fingers, missing fingers, fused hands, duplicate person, extra person, split screen, comic panels, multiple panels, child`（安全版另加 nsfw/explicit/nudity 系；成人版另加無強迫/無醉態/無幼態系；**禁用 `young-looking face`**）。
- 官方建議純自然語言至少兩句、雙人圖逐一描述每名角色——維持。

### 3.1 Safe Quality Block

```text
masterpiece, best quality, year 2025, newest, highres, safe,
anime screenshot, clean cel animation, crisp dark lineart,
two-step cel shading, mature adult characters,
clear silhouette, cinematic night lighting,
controlled highlights, detailed expressive adult eyes,
16:9 composition, no text in image
```

### 3.2 Explicit Quality Block

只可用於核准的成人親密關鍵幀：

```text
masterpiece, best quality, year 2025, newest, highres, explicit,
clean adult anime cel animation, crisp stable lineart,
two-step cel shading, clearly mature adult characters,
mutual consent visible in adult expressions and gestures,
stable anatomy, consistent character identity, 16:9 composition,
no text in image
```

### 3.3 Continuity Block

```text
Maintain the exact approved character face, adult age appearance, hairstyle,
hair accessory or eyebrow scar, eye color, body proportions, clothing state,
handedness, room layout, prop design, camera-side continuity, and light direction.
Do not add people, props, jewelry, text, or background openings.
```

### 3.4 共用 Negative Block

```text
worst quality, low quality, blurry, jpeg artifacts,
chromatic aberration, artist name, text, watermark, logo,
photorealistic, 3d render, chibi, child, teenager, school uniform,
young-looking face, duplicate person, extra person,
extra fingers, missing fingers, fused hands, malformed tools,
inconsistent hair, inconsistent clothes, different eye color,
cropped face, cropped hands, unreadable action, excessive bloom,
broken perspective, mirrored room layout
```

安全版額外 Negative：

```text
nsfw, explicit, nudity, exposed genitals, sexual intercourse
```

成人版額外 Negative：

```text
unconscious, sleeping, intoxicated, coercion, restraint,
forced expression, fear during intimacy, injury, violence,
childlike body, young-looking body, hidden consent reaction
```

## 4. 完整 Prompt 示例

`a1_fuse`：

```text
masterpiece, best quality, year 2025, newest, highres, safe,
anime screenshot, clean cel animation, crisp dark lineart,
two-step cel shading, mature adult characters, clear silhouette,
cinematic night lighting, controlled highlights, 16:9 composition.

Lin Yuwei, a 28-year-old adult woman, 165 cm tall, mature slim build,
soft oval adult face, amber-brown eyes, shoulder-length dark brown hair
curled inward, thin copper hairpin fixed on the left side,
dark plum knitted top and charcoal trousers.

Inside a fictional low-magic urban apartment during a blackout.
The electrical panel is fixed on the right wall. Cold blue darkness,
controlled amber spill, a small red warning point, and muted yellow glow.

Low-angle medium shot. Lin kneels on one knee before the open electrical panel,
holding a narrow flashlight in her left hand while her right hand stops safely
before the switches. Every normal switch is on; one hidden yellow contact pulses
behind the panel in a six-beat rhythm. Both hands, the flashlight, switches,
and her cautious adult expression are clearly readable.

Maintain the exact approved face, age, hairpin, hairstyle, clothing,
room layout, light direction, and electrical panel design. No readable text.
```

Negative 使用共用 Negative Block。

## 5. 角色鎖定流程

1. 以 Character Block 分別生成每名角色正面、3/4、側面及背面。
2. 每個角度至少比較 12 個 seed；只核准一套臉、髮型、比例與服裝。
3. 人工建立角色 contact sheet，加入姓名、年齡、身高與 `ADULT`；不讓 Anima 生成表格文字。
4. 把核准 reference 編號為 `char-{id}-ref-v01`。
5. 先以六張代表候選卡測試雙人一致性，再決定是否需要角色 LoRA。
6. 若訓練 LoRA，官方建議以 Anima Base 而非 Aesthetic／Turbo 為底，低 learning rate 起步，且不要訓練 LLM adapter。

## 6. 姿勢與雙人構圖

正式雙人圖不得只靠一段純文字 prompt：

1. 先鎖定背景及固定房間透視。
2. 以 OpenPose／姿勢 skeleton 固定兩人的骨架、距離與手的位置。
3. 需要精準空間時加入 depth control。
4. 使用 Anima LLLite 或相容控制方法把姿勢／深度送入 Anima。
5. 兩人特徵互相污染時，採區域 conditioning、遮罩分區或分開生成後合成。
6. 臉與手只在構圖核准後進行局部修整。
7. 合成後重新檢查角色身高、視線、接觸點、陰影及光源方向。

雙人角色左右位置在 prompt 中明寫，例如：

```text
Lin stands on frame left near the window. Chen kneels on frame right
in front of the electrical panel. Their bodies do not overlap.
```

## 7. 放大與輸出

1. Anima 正式生成：1536×864 PNG。
2. 人工／局部 inpaint 修正臉、手、工具及房間方向。
3. 放大至 2560×1440；避免改變線稿、眼睛及手部結構的高 denoise 重繪。
4. 輸出 sRGB WebP quality 88，建議單張小於 550 KB；超過 900 KB 即停止檢查構圖與壓縮流程。
5. 由 master 自動縮出 960×540 preview，不另生圖。

## 8. 每張圖片必存 Metadata

```text
asset_id
source_commit
model_filename
model_sha256
workflow_filename
positive_prompt
negative_prompt
seed
steps
cfg
sampler
scheduler
width
height
character_reference_versions
pose_control_filename
depth_control_filename
generation_date
manual_edits
review_status
```

不得只把 seed 寫進檔名；每張圖旁須保存 JSON 或 workflow metadata。

## 9. 授權記錄

Anima 官方授權說明指出，模型與衍生模型受 CircleStone Labs Non-Commercial License 限制，但生成輸出可以作為付費遊戲、視覺小說或委託素材使用；模型權重不得直接嵌入付費遊戲或作為付費生成服務。正式生產時須保存下載來源、檔案 hash、授權版本及取得日期。
