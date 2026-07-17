# Building Manager Playable Art Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `art/deliverables` 的 87 張分鏡、2 張背景與現有遊戲流程整合成完整可玩的測試版，讓玩家能從大樓選房、完成六張卡牌編排、觀看三種結局動態回顧並在畫廊重播。

**Architecture:** 保留 `art/deliverables` 為美術來源，用可重複執行的同步腳本正規化 ID 並複製到 Vite `publicDir` 下的 `content/assets`。一般資產與成人資產分成兩份 manifest；React 啟動時只載入一般 manifest，成人設定開啟後才延遲載入成人 manifest。所有畫面透過 `AssetCatalog` 與可重試圖片元件取圖，結局畫面和畫廊共用 12 秒 `CinematicPlayer`，進度資料額外保存各結局最後一次的六張選擇。

**Tech Stack:** React 19、TypeScript 7、Zustand 5、Zod 4、Vite 8、Vitest 4、Testing Library、Playwright 1.61、GitHub Pages、PowerShell/npm。

## Global Constraints

- 保留使用者目前在 `docs/art` 與 `art/` 的未提交變更，不得重設、覆寫或順手整理。
- `art/deliverables` 是來源；前端只讀 `content/assets`，不得建立本機絕對路徑引用。
- 玩家可見區域不得再顯示灰階 SVG。圖片失敗時要顯示明確錯誤與重試按鈕。
- `content/asset-manifest.json` 不得包含 `/adult/`；成人設定關閉時不得請求 adult manifest 或成人圖片。
- 成人內容不可用時仍要以 safe sequence 完成流程。
- 保留既有 `formal` 美術門檻；本次新增 `playable` 模式，不降低正式發行標準。
- 新增行為先寫失敗測試，再寫最小實作，最後重構。
- 每個 task 只提交該 task 檔案；提交前用 `git status --short` 排除使用者既有變更。
- 最後必須執行 `npm --prefix prototype-web run check`。通過後才可部署精確提交到 GitHub Pages 並交付人工 QA。
- 人工 QA 只使用已成功開啟的 GitHub-hosted preview URL；報告記錄 URL 與 deployed commit。

---

## Task 1: 建立可重複執行的資產正規化管線

**Files:**

- Create: `prototype-web/scripts/runtime-asset-plan.ts`
- Create: `prototype-web/scripts/sync-runtime-assets.ts`
- Create: `prototype-web/tests/unit/runtime-asset-plan.test.ts`
- Modify: `prototype-web/package.json`
- Create by script: `content/assets/common/backgrounds/*.webp`
- Create by script: `content/assets/common/panels/*.webp`
- Create by script: `content/assets/adult/*.webp`
- Modify by script: `content/asset-manifest.json`
- Create by script: `content/adult-asset-manifest.json`

### 1.1 先鎖定 canonical ID 與來源映射

- [ ] 新增測試，讀入兩個 room JSON，驗證 common panel IDs 恰好 75 個：48 個選擇卡、6 個開場、6 個結局海報、12 個 safe intimacy、3 個 sixth-room。
- [ ] 驗證 adult IDs 恰好 12 個，名稱是 `a_intimacy_01` 到 `a_intimacy_06` 與 B 房對應 ID。
- [ ] 驗證 2 個背景，每個 panel 都有 preview/full 來源，所有 target 都位於 `content/assets/common` 或 `content/assets/adult`。
- [ ] 驗證六個錯誤 metadata prefix 不影響 canonical ID：`a1_fuse`、`a2d_chain`、`a4_comfort`、`b1_glass`、`b2n_hall`、`b6_open`。
- [ ] 執行失敗測試：

```powershell
npm --prefix prototype-web test -- tests/unit/runtime-asset-plan.test.ts
```

Expected: FAIL，因為 `runtime-asset-plan.ts` 尚不存在。

### 1.2 實作純函式資產計畫

- [ ] 定義公開介面：

```ts
export type AssetVariant = 'preview' | 'full'

export interface RuntimeAssetEntry {
  preview: string
  full: string
}

export interface PlannedCopy {
  id: string
  scope: 'common' | 'adult' | 'background'
  variant: AssetVariant | 'background'
  sourcePath: string
  targetPath: string
}

export interface RuntimeAssetPlan {
  common: Record<string, RuntimeAssetEntry>
  adult: Record<string, RuntimeAssetEntry>
  backgrounds: Record<string, string>
  copies: PlannedCopy[]
}

export function createRuntimeAssetPlan(repoRoot: string): RuntimeAssetPlan
```

- [ ] 從 `content/rooms/*.json` 的 panels 動態取得 48 個選擇卡 ID。
- [ ] 把 `a_adult_01` 正規化為 `a_intimacy_01`，B 房同理。
- [ ] 把 `a_poster_main|normal|intimacy` 正規化為 `a_ending_main|normal|intimacy`，B 房同理。
- [ ] panel URL 使用 `/assets/common/panels/{canonical-id}_{preview|master}.webp`，成人 URL 使用 `/assets/adult/{canonical-id}_{preview|master}.webp`；實體 target 使用 repo-relative path。
- [ ] 重跑單元測試，Expected: PASS。

### 1.3 實作安全同步 CLI

- [ ] `--write` 先建立完整 plan 並確認所有來源存在，再重建精確目錄 `content/assets/common`、`content/assets/adult`。
- [ ] 清理前以 `path.resolve` 驗證兩個 target 的 parent 恰為 `content/assets`，不符合就丟錯，不可刪除。
- [ ] 使用 Node `copyFile`；manifest 依 key 排序並以兩個空格縮排。
- [ ] common manifest 為 schema 2、mode `playable`，含 `backgrounds` 與 `assets`；adult manifest 為 schema 1，只含 `assets`。
- [ ] `--check` 不寫檔，逐一比較 manifest、檔案存在性與來源/目標 bytes；差異以 exit code 1 結束。
- [ ] 在 package scripts 新增：

```json
"assets:sync": "tsx scripts/sync-runtime-assets.ts --write",
"assets:check-runtime": "tsx scripts/sync-runtime-assets.ts --check"
```

- [ ] 執行：

```powershell
npm --prefix prototype-web run assets:sync
npm --prefix prototype-web run assets:check-runtime
```

Expected: 75 common、12 adult、2 backgrounds 同步完成，check PASS 且不修改檔案。

### 1.4 驗證與提交

- [ ] 執行 `npm --prefix prototype-web test -- tests/unit/runtime-asset-plan.test.ts`、`git diff --check`、`git status --short`。
- [ ] 只 stage 本 task 程式、manifest、runtime copies 與 package files。
- [ ] 提交 `feat: add deterministic runtime art pipeline`。

---

## Task 2: 驗證 manifest 並建立成人延遲載入 AssetCatalog

**Files:**

- Modify: `prototype-web/src/domain/asset-manifest.ts`
- Create: `prototype-web/src/domain/runtime-assets.ts`
- Create: `prototype-web/src/hooks/use-runtime-assets.ts`
- Create: `prototype-web/tests/unit/runtime-assets.test.ts`
- Create: `prototype-web/tests/components/use-runtime-assets.test.tsx`
- Modify: `prototype-web/scripts/validate-assets.ts`
- Modify: `prototype-web/package.json`

### 2.1 先測 manifest 與 URL 解析

- [ ] 驗證 common schema 2、`mode: playable`、75 個一般資產與 2 個背景可解析。
- [ ] common URL 含 `/adult/` 時必須失敗。
- [ ] adult manifest 只接受 12 個 canonical intimacy IDs，路徑都在 `/assets/adult/`。
- [ ] `assetUrl(catalog, 'a1_fuse', 'preview')` 回傳 preview URL；未知 ID 丟出含 ID 的錯誤。
- [ ] Vite base URL 不是 `/` 時仍能產生正確 URL，不硬編碼 GitHub repo URL。
- [ ] 執行失敗測試：

```powershell
npm --prefix prototype-web test -- tests/unit/runtime-assets.test.ts
```

### 2.2 保留 playable/formal 雙模式

- [ ] 定義：

```ts
export interface AssetCatalog {
  common: Record<string, RuntimeAssetEntry>
  adult: Record<string, RuntimeAssetEntry> | null
  backgrounds: Record<string, string>
}

export type RuntimeAssetKind = 'preview' | 'full'
```

- [ ] playable validator 強制 75 common、12 adult、2 backgrounds 並檢查 ID 與路徑隔離。
- [ ] formal validator 保留 64 character references、30 environment/props、16 UI、87 panel masters、20 layered packages 的既有要求。
- [ ] `validate-assets.ts` 先執行 runtime consistency check，再依 mode 選 validator。

### 2.3 先測成人請求邊界

- [ ] stub `fetch`：adultContent false 時只請求 `/asset-manifest.json`。
- [ ] rerender 為 true 才請求 `/adult-asset-manifest.json` 並填入 `catalog.adult`。
- [ ] true 切回 false 時把 adult catalog 清為 `null`。
- [ ] adult manifest 失敗時 common 維持 ready，adult 為 error，提供 `retryAdult()`。
- [ ] common manifest 失敗時提供 blocking error 與 `retryCommon()`。
- [ ] 執行失敗測試：

```powershell
npm --prefix prototype-web test -- tests/components/use-runtime-assets.test.tsx
```

### 2.4 實作 hook

- [ ] 公開介面：

```ts
export interface RuntimeAssetState {
  catalog: AssetCatalog | null
  commonStatus: 'loading' | 'ready' | 'error'
  adultStatus: 'disabled' | 'loading' | 'ready' | 'error'
  retryCommon(): void
  retryAdult(): void
}
```

- [ ] common fetch 使用 `${import.meta.env.BASE_URL}asset-manifest.json`；asset path 經同一 base helper 組合。
- [ ] adult fetch 只存在於 `adultContent === true` 分支；不預載、不 import JSON、不放進 common manifest。

### 2.5 驗證與提交

- [ ] 執行兩個新增測試、`npm --prefix prototype-web run validate:assets` 與 `git diff --check`。
- [ ] 提交 `feat: load isolated runtime asset catalogs`。

---

## Task 3: 接入 App、房間背景與三格開場流程

**Files:**

- Modify: `prototype-web/src/domain/types.ts`
- Modify: `prototype-web/src/domain/content-schema.ts`
- Modify: `prototype-web/src/app/store.ts`
- Modify: `prototype-web/src/app/App.tsx`
- Create: `prototype-web/src/components/OpeningSequence.tsx`
- Create: `prototype-web/src/components/RuntimeImage.tsx`
- Modify: `prototype-web/src/screens/BuildingScreen.tsx`
- Modify: `prototype-web/src/screens/RoomBriefScreen.tsx`
- Modify: `prototype-web/src/styles/building.css`
- Modify: `prototype-web/src/styles/global.css`
- Modify: `content/rooms/room_a_blackout.json`
- Modify: `content/rooms/room_b_wall.json`
- Modify: `prototype-web/tests/unit/content-schema.test.ts`
- Modify: `prototype-web/tests/unit/store.test.ts`
- Modify: `prototype-web/tests/components/app.test.tsx`
- Modify: `prototype-web/tests/components/building-screen.test.tsx`
- Create: `prototype-web/tests/components/opening-sequence.test.tsx`
- Create: `prototype-web/tests/components/runtime-image.test.tsx`

### 3.1 先測內容與 opening state

- [ ] RoomDefinition 新增必填 `backgroundAsset: string` 與 `openingAssets: [string, string, string]`。
- [ ] room A 使用 `building_a`、`a_open_01..03`；room B 使用 B 對應 ID。
- [ ] store 新增 `openingPending: boolean`、`finishOpening()`。
- [ ] `startRoom` 後 openingPending true；finish 後 false；從 currentRun resume 時為 false，避免重整重播。
- [ ] 先跑 content-schema/store tests，確認新測試 FAIL。

### 3.2 先測可重試圖片與開場

- [ ] RuntimeImage 接收 `assetId`、`variant`、`catalog`、`alt`、`className`；成功時渲染真實 img。
- [ ] image error 後顯示「圖片載入失敗」與「重試」；點擊後以 query token 重請同一路徑。
- [ ] OpeningSequence 顯示三格、下一張、跳過、`1 / 3`；第三格繼續呼叫 onComplete。
- [ ] Enter/Space 前進、Escape 跳過，按鈕具有可辨識名稱。
- [ ] openingDialogue 少於三段時沿用最後一段，不顯示空白泡泡。
- [ ] 執行新增 component tests，確認 FAIL 後完成最小實作。

### 3.3 接入 App 與錯誤狀態

- [ ] App 呼叫 `useRuntimeAssets(progress.settings.adultContent)`，把 catalog 明確傳到 screens。
- [ ] common loading 顯示載入；error 顯示阻擋式錯誤與「重新載入美術」。
- [ ] adult error 不阻擋 app，顯示「成人美術暫時無法載入，已改用安全版」。
- [ ] comic route 在 openingPending 時先顯示 OpeningSequence，完成或跳過後才顯示卡牌。

### 3.4 更新大樓與房間簡介

- [ ] 兩個可玩房間卡使用 building backgrounds，保留文字漸層與可存取名稱。
- [ ] 首屏顯示「可玩測試版／placeholder art」。
- [ ] 第六房使用 `sixth_01..03`，不把 `sixth_03` 誤稱六宮格。
- [ ] RoomBrief 顯示背景與三張開場縮圖。
- [ ] 測試斷言 player-visible 圖片來自 catalog，不含 greybox data URL。

### 3.5 驗證與提交

- [ ] 執行 content schema、store、opening、runtime image、building、app tests，以及 `npm --prefix prototype-web run validate:content`。
- [ ] 執行 `git diff --check`。
- [ ] 提交 `feat: add illustrated room entry flow`。

---

## Task 4: 以真實美術取代遊戲中的灰階圖

**Files:**

- Modify: `prototype-web/src/components/CandidateCard.tsx`
- Modify: `prototype-web/src/components/ComicPanel.tsx`
- Modify: `prototype-web/src/screens/ComicScreen.tsx`
- Modify: `prototype-web/src/screens/DraftComicScreen.tsx`
- Modify: `prototype-web/src/styles/comic.css`
- Modify: `prototype-web/tests/components/comic-screen.test.tsx`
- Modify: `prototype-web/tests/components/draft-comic-screen.test.tsx`
- Modify: `prototype-web/tests/components/panel-motion.test.tsx`

### 4.1 先鎖定 preview/full 規則

- [ ] 候選列只使用 `previewAsset` 的 preview URL。
- [ ] 已選入六格的卡使用 `fullAsset ?? previewAsset` 的 full URL。
- [ ] alt 保留行動標籤與格數資訊。
- [ ] 新增斷言：comic DOM 不含 `data:image/svg+xml`、`greybox` 或 `/adult/`。
- [ ] 先執行 comic 與 draft component tests，Expected: FAIL。

### 4.2 改寫卡牌與面板

- [ ] CandidateCard 接收 catalog 與 variant；外層用 article，選擇與重試是分開按鈕，避免互動元件巢狀。
- [ ] ComicPanel 使用 RuntimeImage，保留 PanelMotion 的 standard/hero 與 reduced-motion。
- [ ] ComicScreen、DraftComicScreen 刪除 player-visible `greyboxPanel`、`greyboxAnchor`。
- [ ] 選取區 16:9 且 `object-fit: contain`；候選可用 `object-fit: cover`。
- [ ] 單圖錯誤可重試且不清除目前六張選擇。

### 4.3 驗證與提交

- [ ] legacy 與 drafting tests 各走完一次選擇/確認。
- [ ] 驗證兩房 48 panel IDs 都能解析 preview/full。
- [ ] 執行相關 component tests、`npm --prefix prototype-web run build`、`git diff --check`。
- [ ] 提交 `feat: render gameplay with delivered artwork`。

---

## Task 5: 保存每個結局最後一次六格回顧

**Files:**

- Modify: `prototype-web/src/domain/progress.ts`
- Modify: `prototype-web/src/app/store.ts`
- Modify: `prototype-web/tests/unit/progress.test.ts`
- Modify: `prototype-web/tests/unit/store.test.ts`
- Modify: `prototype-web/tests/unit/draft-store.test.ts`
- Modify: `prototype-web/tests/unit/playtest-store.test.ts`

### 5.1 先測向後相容 schema

- [ ] 定義：

```ts
export type EndingRecaps = Record<
  string,
  Partial<Record<EndingId, string[]>>
>
```

- [ ] ProgressData 新增 `endingRecaps`；舊存檔缺欄位自動補 `{}`。
- [ ] 每筆 recap 接受 1 到 6 個非空、不重複 asset IDs；無法辨識的 entry 不毀損其他舊存檔資料。
- [ ] serialize/deserialize round-trip 保留 recap。
- [ ] 先跑 progress test，Expected: FAIL。

### 5.2 在兩條結算路徑寫入

- [ ] 建立共用 helper，從 engine snapshot 取得依選擇順序的最多六個 panel IDs。
- [ ] legacy 與 drafting 都寫入 `[roomId][endingId]`；重玩同結局覆蓋為最後一次。
- [ ] completed endings、clues、gallery unlocks、currentRun、recap 原子保存。
- [ ] 保存失敗時保留既有重試，不只更新記憶體。
- [ ] 測試 room A/B 與三種 ending，不讓既有 settlement 倒退。

### 5.3 驗證與提交

- [ ] 執行 progress、store、draft-store、playtest-store tests 與 `git diff --check`。
- [ ] 提交 `feat: persist ending recap selections`。

---

## Task 6: 建立 12 秒結局播放器並接入結果與畫廊

**Files:**

- Create: `prototype-web/src/components/CinematicPlayer.tsx`
- Create: `prototype-web/src/domain/ending-recap.ts`
- Modify: `prototype-web/src/screens/ResultScreen.tsx`
- Modify: `prototype-web/src/screens/GalleryScreen.tsx`
- Modify: `prototype-web/src/styles/comic.css`
- Create: `prototype-web/tests/components/cinematic-player.test.tsx`
- Create: `prototype-web/tests/unit/ending-recap.test.ts`
- Modify: `prototype-web/tests/components/result-screen.test.tsx`
- Modify: `prototype-web/tests/components/gallery-screen.test.tsx`
- Modify: `prototype-web/tests/unit/gallery-content.test.ts`

### 6.1 先測 sequence 決策

- [ ] main/normal 有 recap 時使用六張 recap，加對應 ending poster。
- [ ] 舊存檔無 recap 時使用 openingAssets 三張，加 poster。
- [ ] intimacy 且 adult on、catalog ready 時使用 adultSequence 六張，加 poster。
- [ ] intimacy 在 adult off/loading/error 時使用 safeSequence，回傳 `usedSafeFallback: true`。
- [ ] sequence 不混房、不為空。
- [ ] 先跑 `ending-recap.test.ts`，Expected: FAIL。

### 6.2 先測播放器時間與控制

- [ ] 公開介面：

```ts
export interface CinematicPlayerProps {
  assetIds: string[]
  catalog: AssetCatalog
  durationMs?: number
  autoPlay?: boolean
  title: string
  onFinished?(): void
}
```

- [ ] 預設總長 12000ms，依 frame 數平均切換；fake timers 驗證第一、中央、最後 frame 與 callback。
- [ ] 提供播放/暫停、重播、上一格、下一格與 `目前格 / 總格數`。
- [ ] 使用輕微 Ken Burns 與 crossfade；不得閃回灰階。
- [ ] reduced-motion 取消縮放與 crossfade，只離散換圖，時間與控制仍可用。
- [ ] RuntimeImage 重試不停止播放器或讓結果頁崩潰。
- [ ] 先跑 cinematic component test，Expected: FAIL。

### 6.3 接入 ResultScreen

- [ ] 保留統計、線索、返回大樓、重玩；用 CinematicPlayer 取代 greybox。
- [ ] main/normal 顯示剛選六張與 poster；intimacy 依成人狀態決定 adult/safe。
- [ ] adult load failure 顯示 fallback 說明並切 safe，不要求重玩。
- [ ] 六種 route component tests 都斷言正確 ending，adult-off 不含 `/adult/`。

### 6.4 接入 GalleryScreen

- [ ] 已解鎖結局共用 sequence builder 與播放器。
- [ ] main/normal 顯示最後 recap；舊存檔顯示三張開場與 poster。
- [ ] intimacy 只有 adult on 且 catalog ready 使用 adult；其他情況用 safe。
- [ ] 鎖定卡不建立 adult URL、不預載。
- [ ] 切換 entry 停止上一個播放器並從第一格開始。

### 6.5 驗證與提交

- [ ] 執行 ending-recap、cinematic、result、gallery、gallery-content tests。
- [ ] 執行 `npm --prefix prototype-web run build` 與 `git diff --check`。
- [ ] 提交 `feat: add animated ending recaps`。

---

## Task 7: 完成響應式、成人隔離與全路線 E2E

**Files:**

- Modify: `prototype-web/tests/e2e/helpers.ts`
- Modify: `prototype-web/tests/e2e/adult-toggle.spec.ts`
- Modify: `prototype-web/tests/e2e/room-a.spec.ts`
- Modify: `prototype-web/tests/e2e/room-b.spec.ts`
- Modify: `prototype-web/tests/e2e/responsive.spec.ts`
- Modify: `prototype-web/tests/e2e/sixth-room.spec.ts`
- Modify: `prototype-web/src/styles/building.css`
- Modify: `prototype-web/src/styles/comic.css`
- Modify: `prototype-web/src/styles/global.css`

### 7.1 更新 helper

- [ ] `playRoute` 在開場存在時點「跳過開場」，再選滿六張並確認。
- [ ] 結果完成條件為播放器與 ending title 同時可見，不等待完整 12 秒。
- [ ] 記錄 page errors、console errors、failed requests；非刻意資產失敗都讓測試 FAIL。

### 7.2 強化 adult 隔離

- [ ] 監聽所有 requests，涵蓋 room A/B 的 main、normal、intimacy 六路線。
- [ ] adult-off 不得請求 `adult-asset-manifest.json` 或 `/assets/adult/`。
- [ ] intimacy adult-off 看見 safe sequence 與安全版文字。
- [ ] 新增一條 adult-on intimacy，驗證設定開啟後才請求 adult manifest 且能完成播放器。

### 7.3 viewport 與 reduced-motion

- [ ] 1920x1080、1280x800、1280x720 都走首屏、開場、選卡、結果、畫廊。
- [ ] 1280x720 無水平捲動，主要按鈕不被播放器擋住，六格可完整操作。
- [ ] reduced-motion 下 frame 仍切換，computed style 不含縮放動畫。
- [ ] 第六房三張 teaser 可見、仍不可進入、兩房按鈕不受影響。

### 7.4 驗證與提交

- [ ] 執行：

```powershell
npm --prefix prototype-web run test:e2e -- tests/e2e/adult-toggle.spec.ts tests/e2e/responsive.spec.ts tests/e2e/sixth-room.spec.ts
npm --prefix prototype-web run test:e2e
git diff --check
```

- [ ] 提交 `test: verify playable art routes and isolation`。

---

## Task 8: 完整驗證、GitHub Pages 部署與 QA 紀錄

**Files:**

- Create: `.github/workflows/deploy-pages.yml`
- Modify: `prototype-web/README.md`
- Modify: `content/README.md`
- Modify: `art/deliverables/HANDOFF.md`
- Create: `docs/qa/2026-07-18-playable-art-integration.md`
- Modify: `prototype-web/tests/unit/documentation.test.ts`
- Modify: `prototype-web/tests/unit/playwright-config.test.ts`

### 8.1 先測文件與 workflow 合約

- [ ] 文件測試要求 README 記載來源目錄、同步命令、playable/formal、成人隔離、12 秒 recap、正式影片未交付。
- [ ] workflow 測試要求 checkout、Node 24.14.0、完整 check、build:pages、artifact upload、deployment。
- [ ] 先執行 documentation 與 playwright-config tests，Expected: FAIL。

### 8.2 建立 Pages workflow

- [ ] 觸發器為 main push 與 workflow_dispatch；permissions 為 contents read、pages write、id-token write；concurrency group `pages`。
- [ ] build 使用 `actions/checkout@v6`、`actions/setup-node@v7`、`actions/configure-pages@v5`、`actions/upload-pages-artifact@v4`，Node 固定 24.14.0。
- [ ] 依序執行 `npm ci`、`npm --prefix prototype-web run check`、`npm --prefix prototype-web run build:pages`。
- [ ] upload path 為 `prototype-web/dist`；deploy job 使用 environment `github-pages` 與 `actions/deploy-pages@v4`。
- [ ] 不跳測試、不用 `--no-verify`、不在 CI 產生與本機不同的 manifest。

### 8.3 更新交付文件

- [ ] prototype README 記載本機只供自動驗證，人工 QA 必須用 Pages URL。
- [ ] content README 記載 assets:sync/check、common/adult manifests、canonical rename。
- [ ] HANDOFF 記載素材已進 playable placeholder；8 支影片、16 UI、16 props、6 lights 仍是正式發行缺口。
- [ ] QA 報告包含 automated check、commit、workflow run、preview URL、URL open result、manual routes、known gaps。

### 8.4 在精確提交上跑完整閘門

- [ ] 用 `git status --short` 辨識並保留使用者原始 `docs/art`、`art/` 變更。
- [ ] 執行：

```powershell
npm --prefix prototype-web run check
git diff --check
git status --short
```

Expected: content/assets validators、全部 Vitest、build、全部 Playwright projects PASS。

- [ ] 只提交 workflow、文件、測試，訊息 `docs: prepare playable preview deployment`。
- [ ] 用 `git rev-parse HEAD` 記錄 exact tested commit。

### 8.5 部署與 QA 交付

- [ ] 推送目前 `codex/` branch；只有使用者核准整合方式後才合併 main。
- [ ] 以 Pages workflow 部署 exact tested commit；若 workflow 只接受 default branch，先依核准方式整合同一 commit，再由 main push 觸發，不得加入未測修改。
- [ ] 等待 deployment success，取得 workflow run URL 與 Pages URL。
- [ ] 用瀏覽器開啟 Pages URL，確認 HTTP 成功、首屏背景、room A/B 可進、成人預設關閉。
- [ ] QA 報告寫入 deployed game commit、run、URL、開啟結果。若報告另有 evidence commit，仍明確保留遊戲 commit。
- [ ] 人工 QA 路線只交付 Pages URL：兩房各三結局、畫廊、成人開關、第六房、三種 viewport。
- [ ] Pages 無法開啟時標記 manual QA blocked，不得改叫使用者測 localhost。

---

## Final Verification Checklist

- [ ] `npm --prefix prototype-web run assets:check-runtime` PASS。
- [ ] `npm --prefix prototype-web run validate:content` PASS。
- [ ] `npm --prefix prototype-web run validate:assets` PASS。
- [ ] `npm --prefix prototype-web test` PASS。
- [ ] `npm --prefix prototype-web run build` PASS。
- [ ] `npm --prefix prototype-web run test:e2e` 在三個 viewport PASS。
- [ ] `npm --prefix prototype-web run check` 在 exact deploy commit PASS。
- [ ] adult-off 六路線沒有 adult manifest 或 adult image request。
- [ ] 玩家流程沒有 greybox；單圖失敗有重試。
- [ ] 新舊存檔都能進 building/gallery，舊存檔有 deterministic recap fallback。
- [ ] Room A/B 三結局可完成，結果與畫廊有播放/暫停/重播/逐格控制。
- [ ] reduced-motion 與三個 viewport 通過。
- [ ] GitHub Pages preview 已部署並成功開啟。
- [ ] QA 報告記錄 exact commit、workflow run、preview URL、placeholder gaps。
- [ ] 使用者原始美術與 `docs/art` 變更未被誤刪或誤提交。
