# 《大樓管理員》Web 可玩原型 Implementation Plan

> **歷史計畫／已被新規格取代：** 本文件記錄第一版「逐步三選一」灰盒的實作過程，不再是正式玩法來源。2026-07-17 起，正式規格改為每房 24 張牌池、每次隨機發 12 張、確認前自由編排 6 格、確認後整批鎖定並依序揭曉。現行規則以 `docs/superpowers/specs/2026-07-16-night-window-manager-design.md` 與程式測試為準。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先以瀏覽器可玩的方式完成兩房劇情、三選一分鏡、三種結局、跨房線索、已讀快轉、本機存檔與回想圖鑑，用最短週期驗證玩法、美術與遊玩時間，再決定 Godot 移植。

**Architecture:** Web 原型使用 React 與 TypeScript；故事、角色、結局與資源清單保存於根目錄 `content/` 的引擎無關 JSON。UI、故事引擎、進度與演出分離，先以 Vitest 測試純邏輯，再用 React Testing Library 與 Playwright 驗證玩家流程；Web 原型通過明確驗收門檻前不建立正式 Godot 專案。

**Tech Stack:** Node.js 24 LTS、npm 11、React 19.2.7、TypeScript 7.0.2、Vite 8.1.5、Vitest 4.1.10、Zod 4.4.3、Zustand 5.0.14、React Testing Library 16.3.2、Playwright 1.61.1。

## Global Constraints

- 專案名稱固定為「大樓管理員」；設計暫名「夜窗管理員」只保留於設計文件。
- 第一階段只製作 Web 可玩原型；不建立 Godot 程式、不整合 Steamworks、不製作 Windows 安裝檔。
- 所有角色都在 `content/characters.json` 明確標示為成年人。
- 成人內容預設啟用，可在設定關閉；關閉後仍能完成所有主線與普通結局。
- 每房一次流程固定六次不可撤回的三選一，符合規格要求的 5～7 格。
- 候選只顯示無對白畫面；完整對白、狀態與後果在選入後揭曉。
- 每房只有主線、普通／意外及特殊親密三個主要結局。
- 所有合法路線都會抵達完整結局，不設中途失敗。
- 兩房各 24 張候選分鏡，低於每房 30 張硬上限。
- 首次完成兩房的目標時間是 40～50 分鐘；主要收集內容是 60～90 分鐘。
- 支援 1920×1080、1280×720 與 1280×800；操作以滑鼠為主，鍵盤與控制器焦點為次要驗證。
- 美術量產必須遵守 `docs/art/2026-07-16-web-prototype-art-production-spec.md`。
- 所有遊玩事件只保存在瀏覽器本機，由測試者主動匯出 JSON；不得背景上傳資料。
- 每個實作任務使用 TDD：新增失敗測試、確認失敗、寫最小實作、確認通過、提交。

---

## File and Responsibility Map

```text
content/
├── characters.json                   四名成年角色資料
├── rooms/
│   ├── room_a_blackout.json          〈停電之夜〉故事圖
│   └── room_b_wall.json              〈牆後的聲音〉故事圖
├── gallery.json                      結局與回想項目
└── asset-manifest.json               圖片、分層、影片與安全替代路徑

prototype-web/
├── package.json                       固定依賴與 npm 命令
├── vite.config.ts                     Vite、content publicDir、測試設定
├── playwright.config.ts               三種驗收尺寸
├── src/
│   ├── app/App.tsx                    畫面路由
│   ├── app/store.ts                   Zustand 應用狀態
│   ├── domain/content-schema.ts       Zod JSON 契約
│   ├── domain/story-engine.ts         三選一、狀態與旗標
│   ├── domain/ending-resolver.ts      親密 > 主線 > 普通
│   ├── domain/progress.ts             進度與移植無關序列化格式
│   ├── domain/read-history.ts         分鏡＋對白變體已讀狀態
│   ├── domain/repository.ts           以 fetch 載入根目錄 content
│   ├── screens/BuildingScreen.tsx     大樓地圖
│   ├── screens/RoomBriefScreen.tsx    房間簡介
│   ├── screens/ComicScreen.tsx        漫畫與三個候選
│   ├── screens/ResultScreen.tsx       結局與解鎖
│   ├── screens/GalleryScreen.tsx      回想
│   ├── screens/SettingsScreen.tsx     成人內容與顯示設定
│   ├── components/CandidateCard.tsx   無對白候選
│   ├── components/ComicPanel.tsx      揭曉與分層演出
│   ├── components/StatusStrip.tsx     狀態變化
│   ├── analytics/playtest-log.ts      本機測試事件
│   └── styles/                        響應式漫畫 UI
├── tests/unit/                         純邏輯測試
├── tests/components/                   React 元件測試
├── tests/e2e/                          Playwright 完整流程
└── scripts/validate-content.ts         故事與資源數量驗證

game-godot/
└── README.md                           記錄「驗證通過前不實作」

docs/
├── art/                                AI 美術生產規格
├── qa/playtest-script.md               測試主持流程
├── qa/playtest-results-template.md     測試結果
└── decisions/godot-migration-gate.md   是否移植的決策證據
```

---

### Task 1: Bootstrap the Web prototype and exact toolchain

**Files:**
- Create: `prototype-web/package.json`
- Create: `prototype-web/index.html`
- Create: `prototype-web/tsconfig.json`
- Create: `prototype-web/vite.config.ts`
- Create: `prototype-web/playwright.config.ts`
- Create: `prototype-web/src/main.tsx`
- Create: `prototype-web/src/app/App.tsx`
- Create: `prototype-web/src/test/setup.ts`
- Create: `prototype-web/src/styles/global.css`
- Create: `game-godot/README.md`

**Interfaces:**
- Produces: commands `npm run dev`, `npm run test`, `npm run test:e2e`, `npm run build`, `npm run validate:content`.
- Produces: page landmarks `data-testid="building-screen"` and `data-testid="app-loading"`.

- [x] **Step 1: Create package configuration**

```json
{
  "name": "building-manager-web-prototype",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=24.14 <25"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "validate:content": "tsx scripts/validate-content.ts",
    "check": "npm run validate:content && npm run test && npm run build"
  },
  "dependencies": {
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "zod": "4.4.3",
    "zustand": "5.0.14"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.3",
    "jsdom": "29.1.1",
    "tsx": "4.23.1",
    "typescript": "7.0.2",
    "vite": "8.1.5",
    "vitest": "4.1.10"
  }
}
```

- [x] **Step 2: Install dependencies and browser**

Run:

```powershell
npm --prefix prototype-web install
npm --prefix prototype-web exec playwright install chromium
```

Expected: `prototype-web/package-lock.json` exists and both commands exit `0`.

- [x] **Step 3: Configure Vite, TypeScript and tests**

```ts
// prototype-web/vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  publicDir: fileURLToPath(new URL('../content', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
```

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {"@/*": ["src/*"]},
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "tests", "scripts", "vite.config.ts", "playwright.config.ts"]
}
```

```ts
// prototype-web/src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [x] **Step 4: Create and test the initial app**

```html
<!-- prototype-web/index.html -->
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>大樓管理員 Web 原型</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```tsx
// prototype-web/src/app/App.tsx
export function App() {
  return (
    <main className="app-shell">
      <section data-testid="building-screen" aria-label="大樓地圖">
        <h1>大樓管理員</h1>
        <p>Web 可玩原型</p>
      </section>
    </main>
  )
}
```

```tsx
// prototype-web/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

```css
/* prototype-web/src/styles/global.css */
:root {
  font-family: "Noto Sans TC", system-ui, sans-serif;
  color: #f4f1e8;
  background: #10131b;
}
* { box-sizing: border-box; }
html, body, #root { min-width: 320px; min-height: 100%; margin: 0; }
button { font: inherit; }
.app-shell { min-height: 100vh; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```tsx
// prototype-web/tests/components/app.test.tsx
import { render, screen } from '@testing-library/react'
import { App } from '@/app/App'

test('starts on the building map', () => {
  render(<App />)
  expect(screen.getByTestId('building-screen')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '大樓管理員' })).toBeInTheDocument()
})
```

Run:

```powershell
npm --prefix prototype-web test
```

Expected: one passing test.

- [x] **Step 5: Mark Godot as intentionally deferred and commit**

```markdown
# Godot project

此目錄刻意不建立正式引擎專案。Web 原型通過
`docs/decisions/godot-migration-gate.md` 的驗收門檻後，
才建立正式 Godot 專案與第二份實作計畫。
```

```powershell
git add prototype-web game-godot
git commit -m "build: bootstrap web prototype"
```

---

### Task 2: Define the engine-independent content contract

**Files:**
- Create: `prototype-web/src/domain/content-schema.ts`
- Create: `prototype-web/src/domain/types.ts`
- Create: `prototype-web/tests/unit/content-schema.test.ts`
- Create: `content/characters.json`
- Create: `content/gallery.json`
- Create: `content/asset-manifest.json`

**Interfaces:**
- Produces: `parseRoom(value: unknown): RoomDefinition`.
- Produces: `parseCharacters(value: unknown): CharacterDefinition[]`.
- Produces shared types `RoomDefinition`, `PanelDefinition`, `EndingRule`, `ProgressData`.

- [x] **Step 1: Write failing schema tests**

```ts
// prototype-web/tests/unit/content-schema.test.ts
import { describe, expect, test } from 'vitest'
import { parseRoom } from '@/domain/content-schema'

const baseRoom = {
  schemaVersion: 1,
  id: 'fixture',
  title: 'Fixture',
  startNode: 'n1',
  safeNode: 'n5',
  endingAnchor: 'ending',
  nodes: { n1: { candidates: ['p1', 'p2', 'p3'] } },
  panels: {
    p1: { next: 'ending', previewAsset: 'p1' },
    p2: { next: 'ending', previewAsset: 'p2' },
    p3: { next: 'ending', previewAsset: 'p3' },
  },
  endingRules: [{ id: 'normal', priority: 100, conditions: {} }],
}

describe('content schema', () => {
  test('accepts exactly three candidates', () => {
    expect(parseRoom(baseRoom).id).toBe('fixture')
  })

  test('rejects two candidates', () => {
    const invalid = structuredClone(baseRoom)
    invalid.nodes.n1.candidates = ['p1', 'p2']
    expect(() => parseRoom(invalid)).toThrow('exactly 3 candidates')
  })
})
```

- [x] **Step 2: Create exact TypeScript types**

```ts
// prototype-web/src/domain/types.ts
export type StatName = 'affection' | 'trust' | 'intimacy'
export type EndingId = 'main' | 'normal' | 'intimacy'

export interface Conditions {
  allFlags?: string[]
  noneFlags?: string[]
  minimumStats?: Partial<Record<StatName, number>>
}

export interface PanelDefinition {
  next: string
  previewAsset: string
  fullAsset?: string
  safeAsset?: string
  dialogue?: string[]
  dialogueVariant?: string
  effects?: Partial<Record<StatName, number>>
  setFlags?: string[]
  conditions?: Conditions
  motion?: 'standard' | 'hero'
}

export interface StoryNode {
  candidates: [string, string, string]
}

export interface EndingRule {
  id: EndingId
  priority: number
  conditions: Conditions
}

export interface RoomDefinition {
  schemaVersion: 1
  id: string
  title: string
  startNode: string
  alternateStartNodes?: Record<string, string>
  safeNode: string
  endingAnchor: string
  nodes: Record<string, StoryNode>
  panels: Record<string, PanelDefinition>
  endingRules: EndingRule[]
  endingContent: Record<EndingId, {
    title: string
    asset: string
    clueIds: string[]
    galleryUnlocks: string[]
  }>
}

export interface CharacterDefinition {
  id: string
  displayName: string
  age: number
  ageStatus: 'adult'
  roomId: string
}
```

- [x] **Step 3: Implement Zod validation**

```ts
// prototype-web/src/domain/content-schema.ts
import { z } from 'zod'
import type { CharacterDefinition, RoomDefinition } from './types'

const conditionsSchema = z.object({
  allFlags: z.array(z.string()).optional(),
  noneFlags: z.array(z.string()).optional(),
  minimumStats: z.record(z.enum(['affection', 'trust', 'intimacy']), z.number().int()).optional(),
})

const panelSchema = z.object({
  next: z.string().min(1),
  previewAsset: z.string().min(1),
  fullAsset: z.string().optional(),
  safeAsset: z.string().optional(),
  dialogue: z.array(z.string()).optional(),
  dialogueVariant: z.string().optional(),
  effects: z.record(z.enum(['affection', 'trust', 'intimacy']), z.number().int()).optional(),
  setFlags: z.array(z.string()).optional(),
  conditions: conditionsSchema.optional(),
  motion: z.enum(['standard', 'hero']).optional(),
})

const roomSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  startNode: z.string().min(1),
  alternateStartNodes: z.record(z.string(), z.string()).optional(),
  safeNode: z.string().min(1),
  endingAnchor: z.string().min(1),
  nodes: z.record(z.string(), z.object({
    candidates: z.array(z.string()).length(3, 'exactly 3 candidates'),
  })),
  panels: z.record(z.string(), panelSchema),
  endingRules: z.array(z.object({
    id: z.enum(['main', 'normal', 'intimacy']),
    priority: z.number().int(),
    conditions: conditionsSchema,
  })).length(3),
  endingContent: z.record(z.enum(['main', 'normal', 'intimacy']), z.object({
    title: z.string(),
    asset: z.string(),
    clueIds: z.array(z.string()),
    galleryUnlocks: z.array(z.string()),
  })),
})

const charactersSchema = z.array(z.object({
  id: z.string(),
  displayName: z.string(),
  age: z.number().int().min(18),
  ageStatus: z.literal('adult'),
  roomId: z.string(),
}))

export function parseRoom(value: unknown): RoomDefinition {
  return roomSchema.parse(value) as RoomDefinition
}

export function parseCharacters(value: unknown): CharacterDefinition[] {
  return charactersSchema.parse(value) as CharacterDefinition[]
}
```

- [x] **Step 4: Add adult character data and empty runtime roots**

```json
[
  {"id":"lin_yuwei","displayName":"林雨薇","age":28,"ageStatus":"adult","roomId":"room_a_blackout"},
  {"id":"chen_haoran","displayName":"陳皓然","age":31,"ageStatus":"adult","roomId":"room_a_blackout"},
  {"id":"xu_anning","displayName":"許安寧","age":29,"ageStatus":"adult","roomId":"room_b_wall"},
  {"id":"zhou_yan","displayName":"周衍","age":33,"ageStatus":"adult","roomId":"room_b_wall"}
]
```

`content/gallery.json`:

```json
[]
```

`content/asset-manifest.json`:

```json
{"schemaVersion":1,"assets":{}}
```

- [x] **Step 5: Run tests and commit**

```powershell
npm --prefix prototype-web test -- content-schema
git add prototype-web/src/domain prototype-web/tests/unit content
git commit -m "feat: define shared content contract"
```

Expected: two passing schema tests.

---

### Task 3: Implement story selection, states, flags, and endings

**Files:**
- Create: `prototype-web/src/domain/story-engine.ts`
- Create: `prototype-web/src/domain/ending-resolver.ts`
- Create: `prototype-web/tests/unit/story-engine.test.ts`
- Create: `prototype-web/tests/unit/ending-resolver.test.ts`

**Interfaces:**
- Produces: `new StoryEngine(room, inheritedFlags?)`.
- Produces: `getCandidates(): Candidate[]`.
- Produces: `choose(panelId): RevealedPanel`.
- Produces: `resolveEnding(rules, stats, flags): EndingId`.

- [x] **Step 1: Write failing engine tests**

```ts
// prototype-web/tests/unit/story-engine.test.ts
import { describe, expect, test } from 'vitest'
import { StoryEngine } from '@/domain/story-engine'
import type { RoomDefinition } from '@/domain/types'

const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'fixture',
  title: 'Fixture',
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: {
    n1: { candidates: ['p1', 'p2', 'p3'] },
    n2: { candidates: ['p4', 'p5', 'p6'] },
  },
  panels: {
    p1: { next: 'n2', previewAsset: 'p1', effects: { trust: 1 }, setFlags: ['clue'] },
    p2: { next: 'n2', previewAsset: 'p2' },
    p3: { next: 'n2', previewAsset: 'p3' },
    p4: { next: 'ending', previewAsset: 'p4' },
    p5: { next: 'ending', previewAsset: 'p5' },
    p6: { next: 'ending', previewAsset: 'p6' },
  },
  endingRules: [
    { id: 'intimacy', priority: 300, conditions: { allFlags: ['consent'] } },
    { id: 'main', priority: 200, conditions: { allFlags: ['clue'] } },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    main: { title: 'Main', asset: 'main', clueIds: [], galleryUnlocks: [] },
    normal: { title: 'Normal', asset: 'normal', clueIds: [], galleryUnlocks: [] },
    intimacy: { title: 'Intimacy', asset: 'intimacy', clueIds: [], galleryUnlocks: [] },
  },
}

describe('StoryEngine', () => {
  test('returns exactly three current candidates', () => {
    expect(new StoryEngine(room).getCandidates()).toHaveLength(3)
  })

  test('locks selection and applies state', () => {
    const engine = new StoryEngine(room)
    expect(engine.choose('p1').id).toBe('p1')
    expect(engine.snapshot.stats.trust).toBe(1)
    expect(engine.snapshot.flags.clue).toBe(true)
    expect(engine.snapshot.currentNode).toBe('n2')
  })

  test('rejects a panel outside current candidates', () => {
    const engine = new StoryEngine(room)
    expect(() => engine.choose('p4')).toThrow('not a current candidate')
  })
})
```

- [x] **Step 2: Implement the story engine**

```ts
// prototype-web/src/domain/story-engine.ts
import type { PanelDefinition, RoomDefinition, StatName } from './types'

export interface StorySnapshot {
  roomId: string
  currentNode: string
  choiceCount: number
  chosenPanels: string[]
  stats: Record<StatName, number>
  flags: Record<string, boolean>
}

export interface Candidate extends PanelDefinition {
  id: string
}

export class StoryEngine {
  readonly room: RoomDefinition
  snapshot: StorySnapshot

  constructor(room: RoomDefinition, inheritedFlags: Record<string, boolean> = {}) {
    this.room = room
    const alternate = Object.entries(room.alternateStartNodes ?? {})
      .find(([requiredFlag]) => inheritedFlags[requiredFlag])?.[1]
    this.snapshot = {
      roomId: room.id,
      currentNode: alternate ?? room.startNode,
      choiceCount: 0,
      chosenPanels: [],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: { ...inheritedFlags },
    }
  }

  getCandidates(): Candidate[] {
    const node = this.room.nodes[this.snapshot.currentNode]
    if (!node) throw new Error(`missing story node ${this.snapshot.currentNode}`)
    return node.candidates
      .map((id) => ({ id, ...this.room.panels[id]! }))
      .filter((panel) => this.conditionsMatch(panel.conditions))
  }

  choose(panelId: string): Candidate {
    const panel = this.getCandidates().find((candidate) => candidate.id === panelId)
    if (!panel) throw new Error(`${panelId} is not a current candidate`)
    for (const [name, delta] of Object.entries(panel.effects ?? {})) {
      this.snapshot.stats[name as StatName] += delta ?? 0
    }
    for (const flag of panel.setFlags ?? []) this.snapshot.flags[flag] = true
    this.snapshot.chosenPanels.push(panel.id)
    this.snapshot.choiceCount += 1
    this.snapshot.currentNode = panel.next
    return panel
  }

  atEndingAnchor(): boolean {
    return this.snapshot.currentNode === this.room.endingAnchor
  }

  private conditionsMatch(conditions: PanelDefinition['conditions']): boolean {
    if (!conditions) return true
    if (conditions.allFlags?.some((flag) => !this.snapshot.flags[flag])) return false
    if (conditions.noneFlags?.some((flag) => this.snapshot.flags[flag])) return false
    return true
  }
}
```

- [x] **Step 3: Write and implement ending resolution**

```ts
// prototype-web/tests/unit/ending-resolver.test.ts
import { expect, test } from 'vitest'
import { resolveEnding } from '@/domain/ending-resolver'

const rules = [
  { id: 'intimacy' as const, priority: 300, conditions: {
    allFlags: ['consent'], minimumStats: { trust: 4, intimacy: 3 },
  }},
  { id: 'main' as const, priority: 200, conditions: {
    allFlags: ['clue'], minimumStats: { trust: 2 },
  }},
  { id: 'normal' as const, priority: 100, conditions: {} },
]

test('intimacy has priority over main', () => {
  expect(resolveEnding(rules, { affection: 0, trust: 5, intimacy: 4 }, {
    consent: true, clue: true,
  })).toBe('intimacy')
})

test('normal is the guaranteed fallback', () => {
  expect(resolveEnding(rules, { affection: 0, trust: 0, intimacy: 0 }, {})).toBe('normal')
})
```

```ts
// prototype-web/src/domain/ending-resolver.ts
import type { EndingId, EndingRule, StatName } from './types'

export function resolveEnding(
  rules: EndingRule[],
  stats: Record<StatName, number>,
  flags: Record<string, boolean>,
): EndingId {
  const ordered = [...rules].sort((a, b) => b.priority - a.priority)
  return ordered.find((rule) => {
    const conditions = rule.conditions
    if (conditions.allFlags?.some((flag) => !flags[flag])) return false
    if (conditions.noneFlags?.some((flag) => flags[flag])) return false
    return !Object.entries(conditions.minimumStats ?? {})
      .some(([name, minimum]) => stats[name as StatName] < (minimum ?? 0))
  })?.id ?? 'normal'
}
```

- [x] **Step 4: Run domain tests**

```powershell
npm --prefix prototype-web test -- story-engine ending-resolver
```

Expected: five passing tests.

- [x] **Step 5: Commit**

```powershell
git add prototype-web/src/domain prototype-web/tests/unit
git commit -m "feat: add branching story engine"
```

---

### Task 4: Author both exact room graphs and validate every route

**Files:**
- Create: `content/rooms/room_a_blackout.json`
- Create: `content/rooms/room_b_wall.json`
- Create: `prototype-web/scripts/validate-content.ts`
- Create: `prototype-web/tests/unit/all-routes.test.ts`

**Interfaces:**
- Room A outputs `a_hidden_circuit`, `a_symbol_traced`, `a_evidence`, `a_consent`.
- Room B consumes `a_hidden_circuit`; outputs `b_hidden_space`, `b_evidence`, `b_opened_space`, `b_consent`.
- Every route finishes after exactly six choices.

- [x] **Step 1: Encode Room A with these exact nodes**

| Node | Candidate IDs | Required effects / flags | Next |
|---|---|---|---|
| `a1` | `a1_door`, `a1_fuse`, `a1_note` | door trust +1; fuse `a_checked_fuse`; note `a_found_note` | three `a2_*` nodes |
| `a2_door` | `a2d_open`, `a2d_chain`, `a2d_listen` | affection +1; trust +1; trust +2 | `a3` |
| `a2_fuse` | `a2f_reset`, `a2f_tools`, `a2f_call` | none; trust +1 and `a_hidden_circuit`; affection +1 | `a3` |
| `a2_note` | `a2n_follow`, `a2n_photo`, `a2n_wait` | `a_symbol_seen`; `a_note_saved`; none | `a3` |
| `a3` | `a3_trace`, `a3_share`, `a3_candle` | `a_symbol_traced`; trust +1; affection +1 | `a4` |
| `a4` | `a4_ground`, `a4_comfort`, `a4_sleep` | trust +1; affection +1 and intimacy +1; none | `a5` |
| `a5` | `a5_photo`, `a5_ask`, `a5_ignore` | `a_evidence`; trust +1 and intimacy +1; trust -1 | `a6` |
| `a6` | `a6_report`, `a6_consent`, `a6_morning` | `a_reported`; intimacy +2 and `a_consent`; none | `ending` |

Room A ending conditions:

```json
[
  {
    "id":"intimacy",
    "priority":300,
    "conditions":{"allFlags":["a_consent"],"minimumStats":{"trust":4,"intimacy":3}}
  },
  {
    "id":"main",
    "priority":200,
    "conditions":{
      "allFlags":["a_hidden_circuit","a_symbol_traced","a_evidence"],
      "minimumStats":{"trust":2}
    }
  },
  {"id":"normal","priority":100,"conditions":{}}
]
```

- [x] **Step 2: Encode Room B with these exact nodes**

| Node | Candidate IDs | Required effects / flags | Next |
|---|---|---|---|
| `b1` | `b1_glass`, `b1_knock`, `b1_neighbor` | `b_sound_located` and trust +1; trust +1; affection +1 and trust +1 | three `b2_*` nodes |
| `b2_glass` | `b2g_mark`, `b2g_record`, `b2g_cover` | `b_wall_mark`; `b_sound_recorded` and trust +1; none | `b3` |
| `b2_knock` | `b2k_pattern`, `b2k_reply`, `b2k_stop` | trust +1; `b_reply`; none | `b3` |
| `b2_neighbor` | `b2n_invite`, `b2n_hall`, `b2n_refuse` | affection +1; trust +1; trust -1 | `b3` |
| `b3` | `b3_blueprint`, `b3_share`, `b3_music` | `b_blueprint_gap`; trust +1; affection +1 | `b4` |
| `b4` | `b4_measure`, `b4_comfort`, `b4_leave` | `b_hidden_space`; intimacy +1; none | `b5` |
| `b5` | `b5_record`, `b5_ask`, `b5_ignore` | `b_evidence`; trust +1 and intimacy +1; trust -1 | `b6` |
| `b6` | `b6_open`, `b6_consent`, `b6_sleep` | `b_opened_space`; intimacy +2 and `b_consent`; none | `ending` |

Room B uses `"startNode":"b1"`. If `a_hidden_circuit` is present, the comic page adds the circuit-light overlay and uses the `cross_room` dialogue variant, but the same three candidate IDs remain reachable.

Ending conditions:

```json
[
  {
    "id":"intimacy",
    "priority":300,
    "conditions":{"allFlags":["b_consent"],"minimumStats":{"trust":4,"intimacy":3}}
  },
  {
    "id":"main",
    "priority":200,
    "conditions":{
      "allFlags":["b_hidden_space","b_evidence","b_opened_space"],
      "minimumStats":{"trust":2}
    }
  },
  {"id":"normal","priority":100,"conditions":{}}
]
```

- [x] **Step 3: Write exhaustive route validation**

```ts
// prototype-web/tests/unit/all-routes.test.ts
import { describe, expect, test } from 'vitest'
import roomA from '../../../content/rooms/room_a_blackout.json'
import roomB from '../../../content/rooms/room_b_wall.json'
import { parseRoom } from '@/domain/content-schema'
import { StoryEngine } from '@/domain/story-engine'

function walkAllRoutes(roomValue: unknown, inheritedFlags: Record<string, boolean> = {}) {
  const room = parseRoom(roomValue)
  const lengths: number[] = []
  const visit = (node: string, count: number) => {
    if (node === room.endingAnchor) {
      lengths.push(count)
      return
    }
    const engine = new StoryEngine(room, inheritedFlags)
    engine.snapshot.currentNode = node
    for (const candidate of engine.getCandidates()) visit(candidate.next, count + 1)
  }
  visit(new StoryEngine(room, inheritedFlags).snapshot.currentNode, 0)
  return lengths
}

describe('all routes', () => {
  test.each([
    ['room A', roomA, {}],
    ['room B default', roomB, {}],
    ['room B inherited clue', roomB, { a_hidden_circuit: true }],
  ])('%s ends after six choices', (_name, room, flags) => {
    const lengths = walkAllRoutes(room, flags)
    expect(lengths.length).toBeGreaterThan(0)
    expect(new Set(lengths)).toEqual(new Set([6]))
  })
})
```

- [x] **Step 4: Implement CLI content validation**

```ts
// prototype-web/scripts/validate-content.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRoom } from '../src/domain/content-schema'
import { resolveEnding } from '../src/domain/ending-resolver'
import { StoryEngine } from '../src/domain/story-engine'

const here = fileURLToPath(new URL('.', import.meta.url))
const contentRoot = resolve(here, '../../content')

function loadRoom(roomId: string) {
  return parseRoom(JSON.parse(
    readFileSync(resolve(contentRoot, `rooms/${roomId}.json`), 'utf8'),
  ))
}

function validate(roomId: string, inheritedFlags: Record<string, boolean> = {}) {
  const room = loadRoom(roomId)
  const candidateIds = new Set(
    Object.values(room.nodes).flatMap((node) => node.candidates),
  )
  if (candidateIds.size !== 24) {
    throw new Error(`${roomId}: expected 24 candidate panels, got ${candidateIds.size}`)
  }
  const reached = new Set<string>()
  const walk = (path: string[]) => {
    const engine = new StoryEngine(room, inheritedFlags)
    for (const panelId of path) engine.choose(panelId)
    if (engine.atEndingAnchor()) {
      if (engine.snapshot.choiceCount !== 6) {
        throw new Error(`${roomId}: route ${path.join(' > ')} has ${engine.snapshot.choiceCount} choices`)
      }
      reached.add(resolveEnding(room.endingRules, engine.snapshot.stats, engine.snapshot.flags))
      return
    }
    for (const candidate of engine.getCandidates()) walk([...path, candidate.id])
  }
  walk([])
  for (const endingId of ['main', 'normal', 'intimacy']) {
    if (!reached.has(endingId)) throw new Error(`${roomId}: ending ${endingId} is unreachable`)
  }
  console.log(`${roomId}: valid, 24 candidate panels, 3 endings`)
}

validate('room_a_blackout')
validate('room_b_wall')
validate('room_b_wall', { a_hidden_circuit: true })
```

The script prints:

```text
room_a_blackout: valid, 24 candidate panels, 3 endings
room_b_wall: valid, 24 candidate panels, 3 endings
```

Run:

```powershell
npm --prefix prototype-web run validate:content
npm --prefix prototype-web test -- all-routes
```

Expected: both commands exit `0`.

- [x] **Step 5: Commit**

```powershell
git add content/rooms prototype-web/scripts prototype-web/tests/unit/all-routes.test.ts
git commit -m "feat: add two complete room graphs"
```

---

### Task 5: Persist runs, collection progress, settings, and read history

**Files:**
- Create: `prototype-web/src/domain/progress.ts`
- Create: `prototype-web/src/domain/read-history.ts`
- Create: `prototype-web/src/app/store.ts`
- Create: `prototype-web/tests/unit/progress.test.ts`
- Create: `prototype-web/tests/unit/read-history.test.ts`

**Interfaces:**
- LocalStorage key: `building-manager-progress-v1`.
- Produces: `createEmptyProgress()`, `loadProgress(storage)`, `saveProgress(storage, progress)`.
- Stores current irreversible run before reveal.

- [x] **Step 1: Write failing persistence tests**

```ts
// prototype-web/tests/unit/progress.test.ts
import { expect, test } from 'vitest'
import { createEmptyProgress, loadProgress, saveProgress } from '@/domain/progress'

test('adult content defaults to enabled', () => {
  expect(createEmptyProgress().settings.adultContent).toBe(true)
})

test('locked choice survives reload', () => {
  const storage = new Map<string, string>()
  const adapter = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  }
  const progress = createEmptyProgress()
  progress.currentRun = { roomId: 'room_a_blackout', lockedPanelId: 'a1_fuse' }
  saveProgress(adapter, progress)
  expect(loadProgress(adapter).currentRun?.lockedPanelId).toBe('a1_fuse')
})
```

- [x] **Step 2: Implement versioned progress**

```ts
// prototype-web/src/domain/progress.ts
export const PROGRESS_KEY = 'building-manager-progress-v1'

export interface ProgressData {
  version: 1
  currentRun: null | {
    roomId: string
    lockedPanelId?: string
    snapshot?: unknown
  }
  completedEndings: Record<string, string[]>
  clues: string[]
  galleryUnlocks: string[]
  crossRoomFlags: Record<string, boolean>
  readHistory: Record<string, true>
  settings: {
    adultContent: boolean
    exactStats: boolean
    autoFastForward: boolean
  }
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createEmptyProgress(): ProgressData {
  return {
    version: 1,
    currentRun: null,
    completedEndings: {},
    clues: [],
    galleryUnlocks: [],
    crossRoomFlags: {},
    readHistory: {},
    settings: { adultContent: true, exactStats: false, autoFastForward: true },
  }
}

export function loadProgress(storage: StorageAdapter = localStorage): ProgressData {
  const raw = storage.getItem(PROGRESS_KEY)
  if (!raw) return createEmptyProgress()
  try {
    const parsed = JSON.parse(raw) as ProgressData
    return parsed.version === 1 ? parsed : createEmptyProgress()
  } catch {
    return createEmptyProgress()
  }
}

export function saveProgress(
  storage: StorageAdapter = localStorage,
  progress: ProgressData,
): void {
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}
```

- [x] **Step 3: Implement read-history keys**

```ts
// prototype-web/src/domain/read-history.ts
export function readKey(panelId: string, dialogueVariant = 'default'): string {
  return `${panelId}::${dialogueVariant}`
}

export function markRead(history: Record<string, true>, panelId: string, variant?: string) {
  return { ...history, [readKey(panelId, variant)]: true as const }
}

export function wasRead(history: Record<string, true>, panelId: string, variant?: string) {
  return history[readKey(panelId, variant)] === true
}
```

- [x] **Step 4: Build Zustand store with save-before-reveal**

`choosePanel(panelId)` uses this order:

```ts
choosePanel(panelId: string) {
  const state = get()
  if (state.choiceLocked || !state.engine) return
  set({ choiceLocked: true })
  const panel = state.engine.choose(panelId)
  const nextProgress = structuredClone(state.progress)
  nextProgress.currentRun = {
    roomId: state.engine.room.id,
    lockedPanelId: panel.id,
    snapshot: structuredClone(state.engine.snapshot),
  }
  saveProgress(localStorage, nextProgress)
  set({
    progress: nextProgress,
    revealedPanelId: panel.id,
  })
}
```

The store exposes:

```ts
type ScreenId = 'building' | 'roomBrief' | 'comic' | 'result' | 'gallery' | 'settings'

interface AppStore {
  screen: ScreenId
  selectedRoomId: string | null
  progress: ProgressData
  engine: StoryEngine | null
  choiceLocked: boolean
  revealedPanelId: string | null
  goTo(screen: ScreenId): void
  startRoom(roomId: string): Promise<void>
  choosePanel(panelId: string): void
  finishReveal(): void
}
```

- [x] **Step 5: Run tests and commit**

```powershell
npm --prefix prototype-web test -- progress read-history
git add prototype-web/src/domain prototype-web/src/app/store.ts prototype-web/tests/unit
git commit -m "feat: persist prototype progress"
```

Expected: persistence and read-history tests pass.

---

### Task 6: Implement repository loading, building map, and room briefing

**Files:**
- Create: `prototype-web/src/domain/repository.ts`
- Create: `prototype-web/src/screens/BuildingScreen.tsx`
- Create: `prototype-web/src/screens/RoomBriefScreen.tsx`
- Create: `prototype-web/src/styles/building.css`
- Create: `prototype-web/tests/components/building-screen.test.tsx`
- Modify: `prototype-web/src/app/App.tsx`

**Interfaces:**
- `loadRoom(roomId)` fetches `/rooms/{roomId}.json`.
- Initial rooms: both Room A and Room B are open.
- Four future rooms render as locked silhouettes.

- [x] **Step 1: Write failing building-screen test**

```tsx
// prototype-web/tests/components/building-screen.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BuildingScreen } from '@/screens/BuildingScreen'

test('opens the selected available room', async () => {
  const user = userEvent.setup()
  const onOpenRoom = vi.fn()
  render(<BuildingScreen progress={undefined} onOpenRoom={onOpenRoom} onOpenGallery={() => {}} />)
  await user.click(screen.getByRole('button', { name: /停電之夜/ }))
  expect(onOpenRoom).toHaveBeenCalledWith('room_a_blackout')
  expect(screen.getAllByText('未開放')).toHaveLength(4)
})
```

- [x] **Step 2: Implement repository**

```ts
// prototype-web/src/domain/repository.ts
import { parseCharacters, parseRoom } from './content-schema'

export async function loadRoom(roomId: string) {
  const response = await fetch(`/rooms/${roomId}.json`)
  if (!response.ok) throw new Error(`room ${roomId} failed to load`)
  return parseRoom(await response.json())
}

export async function loadCharacters() {
  const response = await fetch('/characters.json')
  if (!response.ok) throw new Error('characters failed to load')
  return parseCharacters(await response.json())
}

export async function loadGallery() {
  const response = await fetch('/gallery.json')
  if (!response.ok) throw new Error('gallery failed to load')
  return response.json()
}
```

- [x] **Step 3: Implement building map**

```tsx
// prototype-web/src/screens/BuildingScreen.tsx
import type { ProgressData } from '@/domain/progress'

interface Props {
  progress?: ProgressData
  onOpenRoom(roomId: string): void
  onOpenGallery(): void
}

const openRooms = [
  { id: 'room_a_blackout', title: '停電之夜' },
  { id: 'room_b_wall', title: '牆後的聲音' },
]

export function BuildingScreen({ progress, onOpenRoom, onOpenGallery }: Props) {
  const tease = progress?.completedEndings.room_a_blackout?.includes('main')
    && progress?.completedEndings.room_b_wall?.includes('main')
  return (
    <section className="building-screen" data-testid="building-screen">
      <header><h1>大樓管理員</h1><button onClick={onOpenGallery}>回想圖鑑</button></header>
      <div className="building-grid">
        {openRooms.map((room) => (
          <button key={room.id} onClick={() => onOpenRoom(room.id)}>
            <span>{room.title}</span>
          </button>
        ))}
        {[1, 2, 3, 4].map((id) => <div key={id} aria-label="未開放房間">未開放</div>)}
        {tease && <div className="sixth-room-tease" aria-label="不存在的第六房間" />}
      </div>
    </section>
  )
}
```

- [x] **Step 4: Implement briefing and app routing**

Room briefing displays:

- Room title.
- Two adult character names and ages.
- Event synopsis.
- Found clue list.
- Three unknown ending markers.
- `開始` or `重新遊玩` button.

`App.tsx` switches on Zustand `screen`; opening a room stores `selectedRoomId` and routes to `roomBrief`.

- [x] **Step 5: Run tests and commit**

```powershell
npm --prefix prototype-web test -- building-screen
git add prototype-web/src prototype-web/tests/components
git commit -m "feat: add building and room briefing"
```

Expected: building-screen test passes.

---

### Task 7: Build the six-step comic selection screen

**Files:**
- Create: `prototype-web/src/screens/ComicScreen.tsx`
- Create: `prototype-web/src/components/CandidateCard.tsx`
- Create: `prototype-web/src/components/ComicPanel.tsx`
- Create: `prototype-web/src/components/StatusStrip.tsx`
- Create: `prototype-web/src/styles/comic.css`
- Create: `prototype-web/tests/components/comic-screen.test.tsx`

**Interfaces:**
- Always renders exactly three candidate cards.
- Candidate images use `alt=""`; accessible names describe only neutral action, never ending direction.
- Choosing disables all cards before reveal starts.

- [x] **Step 1: Write failing irreversible-choice test**

```tsx
// prototype-web/tests/components/comic-screen.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComicScreen } from '@/screens/ComicScreen'

test('locks all three candidates immediately after selection', async () => {
  const user = userEvent.setup()
  render(<ComicScreen roomId="room_a_blackout" />)
  const candidates = await screen.findAllByRole('button', { name: /選擇分鏡/ })
  expect(candidates).toHaveLength(3)
  await user.click(candidates[0]!)
  for (const candidate of candidates) expect(candidate).toBeDisabled()
})
```

- [x] **Step 2: Implement candidate card**

```tsx
// prototype-web/src/components/CandidateCard.tsx
interface Props {
  panelId: string
  previewSrc: string
  disabled: boolean
  onChoose(panelId: string): void
}

export function CandidateCard({ panelId, previewSrc, disabled, onChoose }: Props) {
  return (
    <button
      className="candidate-card"
      disabled={disabled}
      aria-label={`選擇分鏡 ${panelId}`}
      onClick={() => onChoose(panelId)}
    >
      <img src={previewSrc} alt="" draggable={false} />
    </button>
  )
}
```

- [x] **Step 3: Implement comic screen states**

The component renders:

```text
ComicScreen
├── progress: 第 N / 6 格
├── ComicPage
│   ├── fixed opening panels
│   ├── chosen panel slots
│   └── 固定結尾錨點位置
├── StatusStrip
└── CandidateTray
    ├── CandidateCard
    ├── CandidateCard
    └── CandidateCard
```

`onChoose` calls the store method that saves first and reveals second. Until reveal completes, `choiceLocked` remains true.

- [x] **Step 4: Add neutral greybox assets**

Before formal art exists, every candidate uses generated SVG:

```ts
export function greyboxPanel(panelId: string): string {
  const label = encodeURIComponent(panelId)
  return `data:image/svg+xml,` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">` +
    `<rect width="100%" height="100%" fill="%23222935"/>` +
    `<text x="50%" y="50%" fill="white" font-size="42" text-anchor="middle">${label}</text>` +
    `</svg>`
}
```

Greybox labels are visible only in developer mode; playtest mode uses silhouettes and prop icons without IDs.

- [x] **Step 5: Run test and commit**

```powershell
npm --prefix prototype-web test -- comic-screen
git add prototype-web/src prototype-web/tests/components/comic-screen.test.tsx
git commit -m "feat: add irreversible comic choices"
```

Expected: comic-screen test passes.

---

### Task 8: Add dynamic comic reveal and read-aware fast-forward

**Files:**
- Create: `prototype-web/src/components/PanelMotion.tsx`
- Create: `prototype-web/src/domain/read-speed.ts`
- Create: `prototype-web/tests/unit/read-speed.test.ts`
- Create: `prototype-web/tests/components/panel-motion.test.tsx`
- Modify: `prototype-web/src/components/ComicPanel.tsx`

**Interfaces:**
- Standard unread reveal: 2200 ms.
- Hero unread reveal: 3000 ms.
- Read fast-forward: 280 ms.
- New dialogue variant always returns to unread speed.

- [x] **Step 1: Write failing timing tests**

```ts
// prototype-web/tests/unit/read-speed.test.ts
import { expect, test } from 'vitest'
import { revealDuration } from '@/domain/read-speed'

test('unread standard panel is 2200ms', () => {
  expect(revealDuration({ wasRead: false, motion: 'standard', autoFastForward: true })).toBe(2200)
})

test('unread hero panel is 3000ms', () => {
  expect(revealDuration({ wasRead: false, motion: 'hero', autoFastForward: true })).toBe(3000)
})

test('read panel fast-forwards to 280ms', () => {
  expect(revealDuration({ wasRead: true, motion: 'hero', autoFastForward: true })).toBe(280)
})
```

- [x] **Step 2: Implement exact duration function**

```ts
// prototype-web/src/domain/read-speed.ts
export function revealDuration(input: {
  wasRead: boolean
  motion: 'standard' | 'hero'
  autoFastForward: boolean
}): number {
  if (input.wasRead && input.autoFastForward) return 280
  return input.motion === 'hero' ? 3000 : 2200
}
```

- [x] **Step 3: Implement CSS-driven layered motion**

```tsx
// prototype-web/src/components/PanelMotion.tsx
import type { CSSProperties } from 'react'

interface Props {
  layers: { background: string; characterA?: string; characterB?: string; effects?: string }
  durationMs: number
  onFinished(): void
}

export function PanelMotion({ layers, durationMs, onFinished }: Props) {
  return (
    <div
      className="panel-motion"
      style={{ '--reveal-duration': `${durationMs}ms` } as CSSProperties}
      onAnimationEnd={(event) => {
        if (event.animationName === 'panel-settle') onFinished()
      }}
    >
      <img className="layer layer-bg" src={layers.background} alt="" />
      {layers.characterA && <img className="layer layer-a" src={layers.characterA} alt="" />}
      {layers.characterB && <img className="layer layer-b" src={layers.characterB} alt="" />}
      {layers.effects && <img className="layer layer-fx" src={layers.effects} alt="" />}
    </div>
  )
}
```

CSS uses one animation timeline:

```css
.panel-motion {
  position: relative;
  overflow: hidden;
  animation: panel-settle var(--reveal-duration) both;
}
.layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.layer-bg { animation: bg-push var(--reveal-duration) both; }
.layer-a { animation: character-rise var(--reveal-duration) both; }
.layer-fx { animation: ink-reveal var(--reveal-duration) both; }
@keyframes bg-push { from { transform: scale(1.04); } to { transform: scale(1); } }
@keyframes character-rise { from { transform: translateY(1.5%); } to { transform: translateY(0); } }
@keyframes ink-reveal { from { opacity: 0; } 12% { opacity: 1; } to { opacity: 1; } }
@keyframes panel-settle { from { opacity: .01; } to { opacity: 1; } }
```

- [x] **Step 4: Mark read only after reveal completes**

The store updates `readHistory` after `onFinished`; a reload during animation resumes the locked panel and replays its reveal.

After completion, `ComicScreen` renders a visually hidden synchronization marker:

```tsx
<span
  className="sr-only"
  data-testid="reveal-complete"
  data-step={engine.snapshot.choiceCount}
>
  第 {engine.snapshot.choiceCount} 格演出完成
</span>
```

Run:

```powershell
npm --prefix prototype-web test -- read-speed panel-motion
```

Expected: timing and motion tests pass.

- [x] **Step 5: Commit**

```powershell
git add prototype-web/src prototype-web/tests
git commit -m "feat: animate and fast-forward comic panels"
```

---

### Task 9: Settle endings, gallery unlocks, and adult-safe variants

**Files:**
- Create: `prototype-web/src/screens/ResultScreen.tsx`
- Create: `prototype-web/src/screens/GalleryScreen.tsx`
- Create: `prototype-web/src/screens/SettingsScreen.tsx`
- Create: `prototype-web/src/domain/asset-resolver.ts`
- Create: `prototype-web/tests/unit/asset-resolver.test.ts`
- Create: `prototype-web/tests/components/result-screen.test.tsx`
- Modify: `content/gallery.json`

**Interfaces:**
- `resolveAsset(entry, adultContent)` never returns an adult path when false.
- An intimacy ending remains completed when adult content is disabled; only the replay presentation changes.

- [x] **Step 1: Write failing safe-asset test**

```ts
// prototype-web/tests/unit/asset-resolver.test.ts
import { expect, test } from 'vitest'
import { resolveAsset } from '@/domain/asset-resolver'

test('safe mode never returns adult asset', () => {
  expect(resolveAsset({
    default: '/assets/default.webp',
    adult: '/assets/adult.webp',
    safe: '/assets/safe.webp',
  }, false)).toBe('/assets/safe.webp')
})
```

- [x] **Step 2: Implement asset resolution**

```ts
// prototype-web/src/domain/asset-resolver.ts
export interface AssetVariants {
  default?: string
  adult?: string
  safe?: string
}

export function resolveAsset(variants: AssetVariants, adultContent: boolean): string {
  if (!adultContent) return variants.safe ?? variants.default ?? ''
  return variants.adult ?? variants.default ?? variants.safe ?? ''
}
```

- [x] **Step 3: Define gallery entries**

```json
[
  {"id":"room_a_main","roomId":"room_a_blackout","endingId":"main","adult":false},
  {"id":"room_a_normal","roomId":"room_a_blackout","endingId":"normal","adult":false},
  {
    "id":"room_a_intimacy",
    "roomId":"room_a_blackout",
    "endingId":"intimacy",
    "adult":true,
    "adultSequence":["a_intimacy_01","a_intimacy_02","a_intimacy_03","a_intimacy_04","a_intimacy_05","a_intimacy_06"],
    "safeSequence":["a_safe_01","a_safe_02","a_safe_03","a_safe_04","a_safe_05","a_safe_06"]
  },
  {"id":"room_b_main","roomId":"room_b_wall","endingId":"main","adult":false},
  {"id":"room_b_normal","roomId":"room_b_wall","endingId":"normal","adult":false},
  {
    "id":"room_b_intimacy",
    "roomId":"room_b_wall",
    "endingId":"intimacy",
    "adult":true,
    "adultSequence":["b_intimacy_01","b_intimacy_02","b_intimacy_03","b_intimacy_04","b_intimacy_05","b_intimacy_06"],
    "safeSequence":["b_safe_01","b_safe_02","b_safe_03","b_safe_04","b_safe_05","b_safe_06"]
  }
]
```

- [x] **Step 4: Implement result, gallery and settings screens**

Result screen shows ending title, final qualitative stats, new clues and unlocks. Gallery only enables collected entries. Settings toggles:

```ts
{
  adultContent: true,
  exactStats: false,
  autoFastForward: true
}
```

The result root is:

```tsx
<section data-testid="result-screen" aria-labelledby="ending-title">
  <h1 id="ending-title">{endingContent.title}</h1>
  <StatusStrip stats={stats} exact={progress.settings.exactStats} />
  <button onClick={onReplay}>重新遊玩</button>
  <button onClick={onReturn}>返回大樓</button>
</section>
```

When `adultContent` changes, persist immediately and rerender gallery sequence; do not modify ending completion.

- [x] **Step 5: Run tests and commit**

```powershell
npm --prefix prototype-web test -- asset-resolver result-screen
git add prototype-web/src prototype-web/tests content/gallery.json
git commit -m "feat: add results gallery and safe mode"
```

Expected: asset and result tests pass.

---

### Task 10: Add cross-room changes and the sixth-room finale

**Files:**
- Create: `prototype-web/src/domain/unlocks.ts`
- Create: `prototype-web/tests/unit/unlocks.test.ts`
- Create: `prototype-web/tests/e2e/sixth-room.spec.ts`
- Modify: `prototype-web/src/screens/BuildingScreen.tsx`
- Modify: `prototype-web/src/app/store.ts`

**Interfaces:**
- Room A main ending persists `a_hidden_circuit`.
- Room B reads that flag and adds a circuit-light overlay plus `cross_room` dialogue variant without changing the three candidate IDs.
- Sixth-room tease is visible only after both main endings.

- [x] **Step 1: Write failing unlock tests**

```ts
// prototype-web/tests/unit/unlocks.test.ts
import { expect, test } from 'vitest'
import { shouldShowSixthRoom } from '@/domain/unlocks'
import { createEmptyProgress } from '@/domain/progress'

test('requires both main endings', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main'],
    room_b_wall: ['main'],
  }
  expect(shouldShowSixthRoom(progress)).toBe(true)
})

test('one main ending is insufficient', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = { room_a_blackout: ['main'] }
  expect(shouldShowSixthRoom(progress)).toBe(false)
})
```

- [x] **Step 2: Implement unlock rule**

```ts
// prototype-web/src/domain/unlocks.ts
import type { ProgressData } from './progress'

export function shouldShowSixthRoom(progress: ProgressData): boolean {
  return progress.completedEndings.room_a_blackout?.includes('main') === true
    && progress.completedEndings.room_b_wall?.includes('main') === true
}
```

- [x] **Step 3: Persist ending outputs**

When Room A finishes main:

```ts
progress.crossRoomFlags.a_hidden_circuit = true
progress.crossRoomFlags.a_symbol_traced = Boolean(engine.snapshot.flags.a_symbol_traced)
```

When Room B starts:

```ts
const engine = new StoryEngine(roomB, progress.crossRoomFlags)
const roomVisualVariant = progress.crossRoomFlags.a_hidden_circuit ? 'circuit' : 'default'
```

`ComicScreen` sets `data-room-visual-variant={roomVisualVariant}`. The `circuit` CSS variant adds the approved electrical-light overlay; `b1_glass` keeps the same logical panel ID and uses a `cross_room` dialogue variant.

- [x] **Step 4: Add E2E finale test**

```ts
// prototype-web/tests/e2e/sixth-room.spec.ts
import { expect, test } from '@playwright/test'

test('shows sixth room only after both main endings', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('building-manager-progress-v1', JSON.stringify({
      version: 1,
      currentRun: null,
      completedEndings: {
        room_a_blackout: ['main'],
        room_b_wall: ['main'],
      },
      clues: [],
      galleryUnlocks: [],
      crossRoomFlags: { a_hidden_circuit: true },
      readHistory: {},
      settings: { adultContent: true, exactStats: false, autoFastForward: true },
    }))
  })
  await page.goto('/')
  await expect(page.getByLabel('不存在的第六房間')).toBeVisible()
})
```

- [x] **Step 5: Run tests and commit**

```powershell
npm --prefix prototype-web test -- unlocks
npm --prefix prototype-web run test:e2e -- sixth-room
git add prototype-web/src prototype-web/tests
git commit -m "feat: connect rooms and sixth-room finale"
```

Expected: unlock and finale tests pass.

---

### Task 11: Create the art manifest, greybox mode, and exact asset validator

**Files:**
- Create: `prototype-web/src/domain/asset-manifest.ts`
- Create: `prototype-web/src/domain/greybox-assets.ts`
- Create: `prototype-web/scripts/validate-assets.ts`
- Create: `prototype-web/tests/unit/asset-counts.test.ts`
- Modify: `prototype-web/package.json`
- Modify: `content/asset-manifest.json`

**Interfaces:**
- Validation accepts greybox entries during programming.
- `ART_MODE=formal npm run validate:assets` requires the exact art-production counts.
- Formal mode requires 87 panel masters and 20 layered source packages.

- [x] **Step 1: Define manifest structure**

```json
{
  "schemaVersion": 1,
  "mode": "greybox",
  "characterReferenceUnits": [],
  "environmentAndPropUnits": [],
  "uiUnits": [],
  "assets": {},
  "layeredPanels": []
}
```

- [x] **Step 2: Write exact count tests**

```ts
// prototype-web/tests/unit/asset-counts.test.ts
import { expect, test } from 'vitest'
import { requiredArtCounts } from '@/domain/asset-manifest'

test('formal art package uses approved counts', () => {
  expect(requiredArtCounts).toEqual({
    characterReferenceUnits: 64,
    environmentAndPropUnits: 30,
    uiUnits: 16,
    panelMasters: 87,
    layeredPanelPackages: 20,
  })
})
```

- [x] **Step 3: Implement count contract**

```ts
// prototype-web/src/domain/asset-manifest.ts
export const requiredArtCounts = {
  characterReferenceUnits: 64,
  environmentAndPropUnits: 30,
  uiUnits: 16,
  panelMasters: 87,
  layeredPanelPackages: 20,
} as const

export const requiredPanelGroups = {
  openings: 6,
  choices: 48,
  endings: 6,
  adultSequences: 12,
  safeSequences: 12,
  sixthRoom: 3,
} as const
```

- [x] **Step 4: Implement formal validator**

```ts
// prototype-web/scripts/validate-assets.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRoom } from '../src/domain/content-schema'
import { requiredArtCounts } from '../src/domain/asset-manifest'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(here, '../../content')
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const manifest = readJson('asset-manifest.json')

if (manifest.mode !== 'formal') {
  console.log('asset-manifest: greybox mode, formal art files are not required')
  process.exit(0)
}

const roomIds = ['room_a_blackout', 'room_b_wall']
const candidateIds = roomIds.flatMap((roomId) => {
  const room = parseRoom(readJson(`rooms/${roomId}.json`))
  return [...new Set(Object.values(room.nodes).flatMap((node) => node.candidates))]
})
const openings = ['a_open_01','a_open_02','a_open_03','b_open_01','b_open_02','b_open_03']
const endings = [
  'a_ending_normal','a_ending_main','a_ending_intimacy',
  'b_ending_normal','b_ending_main','b_ending_intimacy',
]
const adult = ['a','b'].flatMap((room) =>
  Array.from({ length: 6 }, (_, index) => `${room}_intimacy_0${index + 1}`),
)
const safe = ['a','b'].flatMap((room) =>
  Array.from({ length: 6 }, (_, index) => `${room}_safe_0${index + 1}`),
)
const sixth = ['sixth_01','sixth_02','sixth_03']
const requiredPanels = [...candidateIds, ...openings, ...endings, ...adult, ...safe, ...sixth]
const requiredLayered = [
  'a_open_01','a_open_03','a1_fuse','a2d_listen','a2f_tools',
  'a3_trace','a4_ground','a6_report','a6_consent','a_ending_main',
  'b_open_01','b_open_03','b1_glass','b2g_record','b2k_pattern',
  'b3_blueprint','b4_measure','b6_open','b6_consent','b_ending_main',
]

const errors: string[] = []
for (const panelId of requiredPanels) {
  if (!manifest.assets[panelId]) errors.push(`missing panel asset ${panelId}`)
}
for (const panelId of requiredLayered) {
  if (!manifest.layeredPanels.includes(panelId)) errors.push(`missing layered package ${panelId}`)
}
if (manifest.characterReferenceUnits.length !== requiredArtCounts.characterReferenceUnits) {
  errors.push('character reference count must be 64')
}
if (manifest.environmentAndPropUnits.length !== requiredArtCounts.environmentAndPropUnits) {
  errors.push('environment and prop count must be 30')
}
if (manifest.uiUnits.length !== requiredArtCounts.uiUnits) errors.push('UI count must be 16')
if (requiredPanels.length !== requiredArtCounts.panelMasters) errors.push('panel master count must be 87')
if (requiredLayered.length !== requiredArtCounts.layeredPanelPackages) {
  errors.push('layered package count must be 20')
}
for (const asset of Object.values(manifest.assets) as Array<{ path?: string }>) {
  if (asset.path && /(final2?|new\s)|\s/.test(asset.path)) {
    errors.push(`invalid formal filename ${asset.path}`)
  }
}
if (errors.length) {
  for (const error of errors) console.error(error)
  process.exit(1)
}
console.log('asset-manifest: formal package valid, 87 panels, 20 layered packages')
```

Add:

```json
"validate:assets": "tsx scripts/validate-assets.ts"
```

- [x] **Step 5: Run greybox validation and commit**

```powershell
npm --prefix prototype-web run validate:assets
npm --prefix prototype-web test -- asset-counts
git add prototype-web content/asset-manifest.json
git commit -m "feat: validate approved art package"
```

Expected: greybox mode passes; exact count test passes.

---

### Task 12: Record local playtest evidence without networking

**Files:**
- Create: `prototype-web/src/analytics/playtest-log.ts`
- Create: `prototype-web/src/screens/PlaytestExport.tsx`
- Create: `prototype-web/tests/unit/playtest-log.test.ts`
- Create: `docs/qa/playtest-script.md`
- Create: `docs/qa/playtest-results-template.md`

**Interfaces:**
- LocalStorage key: `building-manager-playtest-v1`.
- Events: `session_started`, `screen_viewed`, `candidate_shown`, `choice_made`, `ending_reached`, `replay_started`, `gallery_opened`.
- Export format: JSON file downloaded by explicit button.

- [x] **Step 1: Write failing analytics test**

```ts
// prototype-web/tests/unit/playtest-log.test.ts
import { expect, test } from 'vitest'
import { PlaytestLog } from '@/analytics/playtest-log'

test('records choice without dialogue or personal data', () => {
  const log = new PlaytestLog('session-1', () => 1000)
  log.record('choice_made', { roomId: 'room_a_blackout', panelId: 'a1_fuse', step: 1 })
  expect(log.events[0]).toEqual({
    sessionId: 'session-1',
    timestampMs: 1000,
    type: 'choice_made',
    payload: { roomId: 'room_a_blackout', panelId: 'a1_fuse', step: 1 },
  })
})
```

- [x] **Step 2: Implement event log and export**

```ts
// prototype-web/src/analytics/playtest-log.ts
export type PlaytestEventType =
  | 'session_started'
  | 'screen_viewed'
  | 'candidate_shown'
  | 'choice_made'
  | 'ending_reached'
  | 'replay_started'
  | 'gallery_opened'

export class PlaytestLog {
  events: Array<{
    sessionId: string
    timestampMs: number
    type: PlaytestEventType
    payload: Record<string, string | number | boolean>
  }> = []

  constructor(
    private readonly sessionId: string,
    private readonly now: () => number = Date.now,
  ) {}

  record(type: PlaytestEventType, payload: Record<string, string | number | boolean>) {
    this.events.push({ sessionId: this.sessionId, timestampMs: this.now(), type, payload })
  }

  exportBlob(): Blob {
    return new Blob([JSON.stringify({ version: 1, events: this.events }, null, 2)], {
      type: 'application/json',
    })
  }
}
```

- [x] **Step 3: Write exact playtest procedure**

`docs/qa/playtest-script.md`:

```markdown
# Web 原型玩家測試

## 人數

- 第一輪：5 人。
- 第二輪：至少 5 人，且不得全部與第一輪相同。

## 流程

1. 不解釋結局條件，只說「依畫面選擇漫畫格」。
2. 先玩任一房間到結局。
3. 詢問是否願意立即重玩；記錄自發重玩與受邀重玩。
4. 完成另一房間。
5. 隨機抽兩組三選一，請測試者口述三個行動意圖。
6. 匯出本機測試 JSON。

## 必問問題

- 哪一次選擇最難判斷？為什麼？
- 結果是否與候選畫面合理相關？
- 第一次完成後是否想找其他結局？
- 數值提示太多、太少或剛好？
- 大樓共同謎團是否足以讓你想玩正式版？
```

- [x] **Step 4: Add results template**

Template includes:

- Test date and build commit.
- Each room completion time.
- Candidate recognition answers.
- Ending reached.
- Whether tester voluntarily replayed.
- Art consistency defects.
- Top three confusion points.
- Required changes before next round.

- [x] **Step 5: Run test and commit**

```powershell
npm --prefix prototype-web test -- playtest-log
git add prototype-web/src/analytics prototype-web/src/screens/PlaytestExport.tsx prototype-web/tests/unit/playtest-log.test.ts docs/qa
git commit -m "feat: capture local playtest evidence"
```

Expected: analytics test passes.

---

### Task 13: Finish responsive layout, accessibility, and complete E2E flows

**Files:**
- Create: `prototype-web/tests/e2e/room-a.spec.ts`
- Create: `prototype-web/tests/e2e/room-b.spec.ts`
- Create: `prototype-web/tests/e2e/responsive.spec.ts`
- Create: `prototype-web/tests/e2e/adult-toggle.spec.ts`
- Modify: `prototype-web/playwright.config.ts`
- Modify: `prototype-web/src/styles/*.css`

**Interfaces:**
- Playwright projects: `desktop-1080`, `desktop-720`, `steam-deck-ratio`.
- All six endings have an automated route.
- Adult-off flow never loads a path containing `/adult/`.

- [x] **Step 1: Configure three viewports**

```ts
// prototype-web/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop-1080', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'desktop-720', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'steam-deck-ratio', use: { viewport: { width: 1280, height: 800 } } },
  ],
})
```

- [x] **Step 2: Add one route helper**

```ts
// prototype-web/tests/e2e/helpers.ts
import { expect, type Page } from '@playwright/test'

export async function playRoute(page: Page, roomName: RegExp, panelIds: string[]) {
  await page.getByRole('button', { name: roomName }).click()
  await page.getByRole('button', { name: /開始|重新遊玩/ }).click()
  for (const [index, panelId] of panelIds.entries()) {
    await page.getByRole('button', { name: `選擇分鏡 ${panelId}` }).click()
    if (index < panelIds.length - 1) {
      await expect(page.getByTestId('reveal-complete'))
        .toHaveAttribute('data-step', String(index + 1))
    } else {
      await expect(page.getByTestId('result-screen')).toBeVisible()
    }
  }
}
```

- [x] **Step 3: Automate all six endings**

Room A:

```ts
const roomARoutes = {
  main: ['a1_fuse','a2f_tools','a3_trace','a4_ground','a5_photo','a6_report'],
  intimacy: ['a1_door','a2d_listen','a3_share','a4_comfort','a5_ask','a6_consent'],
  normal: ['a1_note','a2n_wait','a3_candle','a4_sleep','a5_ignore','a6_morning'],
}
```

Room B:

```ts
const roomBRoutes = {
  main: ['b1_glass','b2g_record','b3_blueprint','b4_measure','b5_record','b6_open'],
  intimacy: ['b1_neighbor','b2n_hall','b3_share','b4_comfort','b5_ask','b6_consent'],
  normal: ['b1_glass','b2g_cover','b3_music','b4_leave','b5_ignore','b6_sleep'],
}
```

Each test expects the correct ending heading.

- [x] **Step 4: Add responsive and adult-off assertions**

At all three sizes:

- Candidate tray is inside viewport.
- Three candidate cards are visible without horizontal page scrolling.
- Main comic panel is at least 640×360.
- Status strip does not overlap candidates.
- Font size is at least 16 CSS px.

Adult-off test listens to requests and fails if any URL contains `/adult/`.

- [x] **Step 5: Run E2E and commit**

```powershell
npm --prefix prototype-web run test:e2e
git add prototype-web/tests/e2e prototype-web/playwright.config.ts prototype-web/src/styles
git commit -m "test: cover complete responsive prototype"
```

Expected: all route, responsive and content-toggle tests pass in three projects.

---

### Task 14: Add CI, build artifact, and the Godot migration gate

**Files:**
- Create: `.github/workflows/validate-web.yml`
- Create: `docs/decisions/godot-migration-gate.md`
- Create: `docs/qa/web-prototype-acceptance-report.md`
- Modify: `prototype-web/package.json`

**Interfaces:**
- CI runs content validation, unit/component tests, production build and Chromium E2E.
- `dist/` is uploaded as an Actions artifact, not deployed publicly.
- Godot implementation cannot begin until the decision document is filled with measured evidence and approved.

- [x] **Step 1: Add GitHub Actions**

```yaml
# .github/workflows/validate-web.yml
name: validate-web

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: prototype-web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.18.0
          cache: npm
          cache-dependency-path: prototype-web/package-lock.json
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run validate:content
      - run: npm test
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        with:
          name: building-manager-web-prototype
          path: prototype-web/dist
```

- [x] **Step 2: Add one full local check**

Update:

```json
"check": "npm run validate:content && npm run validate:assets && npm test && npm run build && npm run test:e2e"
```

Run:

```powershell
npm --prefix prototype-web run check
```

Expected: exit `0`; `prototype-web/dist/index.html` exists.

- [x] **Step 3: Create the acceptance report**

```markdown
# Web Prototype Acceptance Report

- Date: NOT RUN
- Commit: NOT RUN
- Testers round 1: NOT RUN
- Testers round 2: NOT RUN

## Automated

- Content validation: NOT RUN
- Asset validation mode: NOT RUN
- Unit/component tests: NOT RUN
- E2E tests: NOT RUN
- Production build: NOT RUN

## Player evidence

- Median first completion time: NOT RUN
- Median two-room completion time: NOT RUN
- Voluntary replay rate: NOT RUN
- Candidate intent recognition: NOT RUN
- Result-prediction fairness: NOT RUN
- Common mystery interest: NOT RUN

## Art evidence

- Style-lock package approved: NOT RUN
- Character consistency defects: NOT RUN
- Hand/prop defects: NOT RUN
- 1280×720 readability: NOT RUN
- 3-second motion stability: NOT RUN

## Remaining blockers

- NOT RUN
```

Replace every `NOT RUN` with measured data before approval.

- [x] **Step 4: Create exact Godot migration thresholds**

```markdown
# Godot Migration Gate

Godot planning may begin only when all items pass:

- [ ] Both automated room graphs have zero broken routes.
- [ ] All six endings are reachable with adult content on and off.
- [ ] At least 10 people have completed one room.
- [ ] At least 5 people have completed both rooms.
- [ ] At least 80% of sampled candidate triplets are correctly distinguished without dialogue.
- [ ] At least 60% of testers voluntarily replay or explicitly state they want another ending.
- [ ] Median first two-room completion is 35–55 minutes.
- [ ] No candidate result is rated “unrelated to the image” by more than 20% of testers.
- [ ] The 26-item style-lock package is approved.
- [ ] 3-second motion tests have no major face, hand, clothing or background drift.
- [ ] 1280×720 and 1280×800 layouts have no blocking overlap.
- [ ] The approved content JSON contains no Web-only behavior.

Decision:

- [ ] APPROVE Godot migration plan
- [ ] CONTINUE Web iteration
```

- [x] **Step 5: Commit**

```powershell
git add .github prototype-web/package.json docs/decisions docs/qa/web-prototype-acceptance-report.md
git commit -m "build: gate Godot migration on web evidence"
```

---

## Self-review Checklist

Before implementing this plan:

- [x] Every requirement in the approved game design maps to a task.
- [x] Web-only code does not leak into `content/` JSON.
- [x] Both rooms contain exactly 24 candidate panels and six choices per run.
- [x] Every adult gallery entry has a safe sequence.
- [x] No task creates Godot code before the migration gate.
- [x] Art counts match the separate production spec: 87 panel masters and 20 layered packages.
- [x] E2E routes cover all six endings and three viewports.
- [x] Playtest collection is local-only and contains no personal data.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-night-window-manager-web-prototype.md`.

Two execution options after this plan is approved:

1. **Subagent-Driven (recommended)** — implement one reviewed task at a time with `subagent-driven-development`.
2. **Inline Execution** — execute in batches with `executing-plans` and explicit checkpoints.

The Godot migration is not part of either option. It receives a separate implementation plan only after the migration gate is approved.

## Spec Coverage Map

| Approved design area | Implemented by |
|---|---|
| Two rooms, six choices, three endings | Tasks 3–4, 7, 9, 13 |
| No failure routes and branch convergence | Tasks 3–4, 13 |
| Adult characters and safe-content toggle | Tasks 2, 9, 13 |
| Building map, room brief, comic, result, gallery, settings | Tasks 6–10 |
| Dynamic comic and exact reveal timing | Task 8 |
| Save-before-reveal and irreversible choices | Tasks 5, 7 |
| Read history and automatic fast-forward | Tasks 5, 8 |
| Cross-room clues and sixth-room tease | Task 10 |
| Responsive PC and Steam Deck ratio | Task 13 |
| Story graph, save, route and content validation | Tasks 2–5, 11, 13–14 |
| AI art quantities, poses and seconds | Task 11 and the dedicated art-production spec |
| Web-first validation before Godot | Tasks 12–14 |
