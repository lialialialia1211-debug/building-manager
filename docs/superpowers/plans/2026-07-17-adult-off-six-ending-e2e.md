# Adult-Off Six-Ending E2E Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that all six Room A and Room B endings complete with adult content disabled, never request `/adult/` resources, and use the designated safe result assets for both intimacy endings.

**Architecture:** Keep all six canonical browser routes in one E2E-only fixture module, then consume that module from the existing adult-on room specs and a parameterized adult-off matrix. Do not change production behavior; record the passing browser evidence in the acceptance report and migration gate while leaving human playtest, art approval, and Godot migration blocked.

**Tech Stack:** TypeScript 7, React 19, Playwright 1.61, Vitest 4, Vite 8, npm, Markdown, Git

## Global Constraints

- Use Node.js `>=24.14 <25`; the synchronized baseline uses Node.js `24.14.1`.
- Keep canonical route data entirely under `prototype-web/tests/e2e`; do not add it to `content/` or the production bundle.
- Do not modify production code or game content unless a new E2E case exposes a real defect; if that happens, stop this plan and diagnose the defect with `systematic-debugging` before changing scope.
- Run every adult-off route in the existing `desktop-1080` (1920×1080), `desktop-720` (1280×720), and `steam-deck-ratio` (1280×800) Playwright projects.
- Every adult-off run must reach the expected heading and collect zero request URLs containing `/adult/`.
- Room A and Room B intimacy results must use `a_safe_06` and `b_safe_06`, respectively.
- Preserve the existing adult-on route coverage and `playRoute` behavior.
- Run `npm --prefix prototype-web run check` before completion, as required by the repository `AGENTS.md`.
- Do not request manual QA, deploy a preview, publish to GitHub Pages, or approve Godot migration in this scope.

## File Structure

- Create `prototype-web/tests/e2e/ending-routes.ts`: typed single source of truth for the six canonical ending routes.
- Modify `prototype-web/tests/e2e/room-a.spec.ts`: consume the three shared Room A routes while preserving adult-on assertions.
- Modify `prototype-web/tests/e2e/room-b.spec.ts`: consume the three shared Room B routes while preserving adult-on assertions.
- Modify `prototype-web/tests/e2e/adult-toggle.spec.ts`: execute all six routes with adult content disabled and enforce request and safe-asset assertions.
- Modify `docs/qa/web-prototype-acceptance-report.md`: record the implementation commit and measured 6/6 adult-off evidence.
- Modify `docs/decisions/godot-migration-gate.md`: mark only the adult-on/off six-ending criterion complete and retain `CONTINUE Web iteration`.

---

### Task 1: Centralize the Six Canonical Ending Routes

**Files:**
- Create: `prototype-web/tests/e2e/ending-routes.ts`
- Modify: `prototype-web/tests/e2e/room-a.spec.ts:1-59`
- Modify: `prototype-web/tests/e2e/room-b.spec.ts:1-59`
- Test: `prototype-web/tests/e2e/room-a.spec.ts`
- Test: `prototype-web/tests/e2e/room-b.spec.ts`

**Interfaces:**
- Consumes: existing `playRoute(page, roomName, panelIds, options)` from `prototype-web/tests/e2e/helpers.ts`.
- Produces: `EndingRoute`, `roomARoutes`, `roomBRoutes`, and `endingRoutes` from `prototype-web/tests/e2e/ending-routes.ts`.
- `EndingRoute.panels` is a fixed six-item readonly tuple; callers pass `[...route.panels]` to `playRoute`.

- [ ] **Step 1: Run the existing Room A and Room B route specs as characterization tests**

Run:

```powershell
npm --prefix prototype-web run test:e2e -- tests/e2e/room-a.spec.ts tests/e2e/room-b.spec.ts
```

Expected: `18 passed` across six routes and three Playwright projects.

- [ ] **Step 2: Create the typed shared route fixture**

Create `prototype-web/tests/e2e/ending-routes.ts` with exactly:

```ts
export type EndingId = 'main' | 'intimacy' | 'normal'

type RoomId = 'room_a_blackout' | 'room_b_wall'
type RoomLabel = 'Room A' | 'Room B'
type SafeResultAssetId = 'a_safe_06' | 'b_safe_06'

export interface EndingRoute {
  roomId: RoomId
  roomLabel: RoomLabel
  roomName: RegExp
  endingId: EndingId
  heading: string
  dealSeed: string
  panels: readonly [string, string, string, string, string, string]
  safeResultAssetId?: SafeResultAssetId
}

export const roomARoutes: readonly EndingRoute[] = [
  {
    roomId: 'room_a_blackout',
    roomLabel: 'Room A',
    roomName: /停電之夜/,
    endingId: 'main',
    heading: '藏在停電後的線索',
    dealSeed: '00000000-0000-4000-8000-000000000011',
    panels: [
      'a1_fuse',
      'a2f_tools',
      'a3_trace',
      'a4_ground',
      'a5_photo',
      'a6_report',
    ],
  },
  {
    roomId: 'room_a_blackout',
    roomLabel: 'Room A',
    roomName: /停電之夜/,
    endingId: 'intimacy',
    heading: '停電之夜的承諾',
    dealSeed: '00000000-0000-4000-8000-000000000018',
    panels: [
      'a1_door',
      'a2d_listen',
      'a3_share',
      'a4_comfort',
      'a5_ask',
      'a6_consent',
    ],
    safeResultAssetId: 'a_safe_06',
  },
  {
    roomId: 'room_a_blackout',
    roomLabel: 'Room A',
    roomName: /停電之夜/,
    endingId: 'normal',
    heading: '天亮之前',
    dealSeed: '00000000-0000-4000-8000-000000001652',
    panels: [
      'a1_note',
      'a2n_wait',
      'a3_candle',
      'a4_sleep',
      'a5_ignore',
      'a6_morning',
    ],
  },
]

export const roomBRoutes: readonly EndingRoute[] = [
  {
    roomId: 'room_b_wall',
    roomLabel: 'Room B',
    roomName: /牆後的聲音/,
    endingId: 'main',
    heading: '牆後的空間',
    dealSeed: '00000000-0000-4000-8000-000000000904',
    panels: [
      'b1_glass',
      'b2g_record',
      'b3_blueprint',
      'b4_measure',
      'b5_record',
      'b6_open',
    ],
  },
  {
    roomId: 'room_b_wall',
    roomLabel: 'Room B',
    roomName: /牆後的聲音/,
    endingId: 'intimacy',
    heading: '牆邊的約定',
    dealSeed: '00000000-0000-4000-8000-000000000041',
    panels: [
      'b1_neighbor',
      'b2n_hall',
      'b3_share',
      'b4_comfort',
      'b5_ask',
      'b6_consent',
    ],
    safeResultAssetId: 'b_safe_06',
  },
  {
    roomId: 'room_b_wall',
    roomLabel: 'Room B',
    roomName: /牆後的聲音/,
    endingId: 'normal',
    heading: '聲音沉寂之後',
    dealSeed: '00000000-0000-4000-8000-000000000806',
    panels: [
      'b1_glass',
      'b2g_cover',
      'b3_music',
      'b4_leave',
      'b5_ignore',
      'b6_sleep',
    ],
  },
]

export const endingRoutes: readonly EndingRoute[] = [
  ...roomARoutes,
  ...roomBRoutes,
]
```

- [ ] **Step 3: Refactor the Room A spec to consume `roomARoutes`**

Replace `prototype-web/tests/e2e/room-a.spec.ts` with:

```ts
import { expect, test } from '@playwright/test'
import { roomARoutes } from './ending-routes'
import { playRoute } from './helpers'

for (const route of roomARoutes) {
  test(`Room A reaches its ${route.endingId} ending`, async ({ page }) => {
    await playRoute(
      page,
      route.roomName,
      [...route.panels],
      { dealSeed: route.dealSeed },
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: route.heading,
      }),
    ).toBeVisible()
  })
}
```

- [ ] **Step 4: Refactor the Room B spec to consume `roomBRoutes`**

Replace `prototype-web/tests/e2e/room-b.spec.ts` with:

```ts
import { expect, test } from '@playwright/test'
import { roomBRoutes } from './ending-routes'
import { playRoute } from './helpers'

for (const route of roomBRoutes) {
  test(`Room B reaches its ${route.endingId} ending`, async ({ page }) => {
    await playRoute(
      page,
      route.roomName,
      [...route.panels],
      { dealSeed: route.dealSeed },
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: route.heading,
      }),
    ).toBeVisible()
  })
}
```

- [ ] **Step 5: Run the characterization tests after the refactor**

Run:

```powershell
npm --prefix prototype-web run test:e2e -- tests/e2e/room-a.spec.ts tests/e2e/room-b.spec.ts
```

Expected: `18 passed`; the test names and adult-on behavior remain unchanged.

- [ ] **Step 6: Verify test-only scope and commit the shared fixture**

Run:

```powershell
git diff --check
git status --short
git diff -- prototype-web/tests/e2e/ending-routes.ts prototype-web/tests/e2e/room-a.spec.ts prototype-web/tests/e2e/room-b.spec.ts
```

Expected: only the three listed E2E files differ; `git diff --check` exits `0`.

Commit:

```powershell
git add -- prototype-web/tests/e2e/ending-routes.ts prototype-web/tests/e2e/room-a.spec.ts prototype-web/tests/e2e/room-b.spec.ts
git commit -m "test: centralize canonical ending routes"
```

---

### Task 2: Expand Adult-Off Coverage to All Six Endings

**Files:**
- Modify: `prototype-web/tests/e2e/adult-toggle.spec.ts:1-33`
- Test: `prototype-web/tests/e2e/adult-toggle.spec.ts`

**Interfaces:**
- Consumes: `endingRoutes` from Task 1 and existing `playRoute` from `prototype-web/tests/e2e/helpers.ts`.
- Produces: six parameterized adult-off tests, expanded by Playwright into 18 runs across the three configured projects.

- [ ] **Step 1: Capture the current narrow adult-off baseline**

Run:

```powershell
npm --prefix prototype-web run test:e2e -- tests/e2e/adult-toggle.spec.ts
```

Expected before editing: `3 passed`, covering only Room A intimacy across three Playwright projects.

- [ ] **Step 2: Replace the single adult-off case with the six-route matrix**

Replace `prototype-web/tests/e2e/adult-toggle.spec.ts` with:

```ts
import { expect, test } from '@playwright/test'
import { endingRoutes } from './ending-routes'
import { playRoute } from './helpers'

for (const route of endingRoutes) {
  test(
    `adult-off ${route.roomLabel} ${route.endingId} reaches the correct ending without adult assets`,
    async ({ page }) => {
      const adultRequests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('/adult/')) {
          adultRequests.push(request.url())
        }
      })

      await playRoute(
        page,
        route.roomName,
        [...route.panels],
        {
          adultContent: false,
          dealSeed: route.dealSeed,
        },
      )

      await expect(
        page.getByRole('heading', {
          level: 1,
          name: route.heading,
        }),
      ).toBeVisible()

      expect(adultRequests).toEqual([])

      if (route.safeResultAssetId) {
        await expect(page.getByTestId('result-art'))
          .toHaveAttribute(
            'data-asset-id',
            route.safeResultAssetId,
          )
      }
    },
  )
}
```

- [ ] **Step 3: Run the expanded adult-off matrix**

Run:

```powershell
npm --prefix prototype-web run test:e2e -- tests/e2e/adult-toggle.spec.ts
```

Expected: `18 passed`. Playwright output lists Room A and Room B `main`, `intimacy`, and `normal` in each of the three projects. Any failed `expect(adultRequests).toEqual([])` prints the collected request URLs.

If any route fails, do not edit production code in this task. Preserve the failing output, invoke `systematic-debugging`, identify whether the failure is a test-data error or a real adult-content defect, and obtain scope approval before implementing a production fix.

- [ ] **Step 4: Verify the focused diff and commit the evidence matrix**

Run:

```powershell
git diff --check
git status --short
git diff -- prototype-web/tests/e2e/adult-toggle.spec.ts
```

Expected: only `adult-toggle.spec.ts` differs from Task 1's committed state; `git diff --check` exits `0`.

Commit:

```powershell
git add -- prototype-web/tests/e2e/adult-toggle.spec.ts
git commit -m "test: cover all endings with adult content disabled"
```

---

### Task 3: Record the Automated Evidence Without Unblocking Godot

**Files:**
- Modify: `docs/qa/web-prototype-acceptance-report.md:3-44`
- Modify: `docs/decisions/godot-migration-gate.md:5-27`
- Test: `prototype-web/tests/unit/documentation.test.ts`

**Interfaces:**
- Consumes: the exact 40-character Task 2 commit SHA from `git rev-parse HEAD` and the measured Task 2 targeted result of `18 passed`.
- Produces: acceptance-report and migration-gate evidence that both point to the same implementation commit.

- [ ] **Step 1: Capture the immutable implementation commit identifier**

Run:

```powershell
$testCommit = git rev-parse HEAD
$testDate = Get-Date -Format 'yyyy-MM-dd'
Write-Output "testDate=$testDate"
Write-Output "testCommit=$testCommit"
```

Expected: `testDate=2026-07-17` when executed on the plan date and a 40-character SHA for the Task 2 commit. Use the actual command output in both documentation files; never leave `$testDate`, `$testCommit`, an abbreviated SHA, or plan notation in committed Markdown.

- [ ] **Step 2: Update the acceptance report with the measured evidence**

In `docs/qa/web-prototype-acceptance-report.md`:

1. Set `自動化執行日期` to the exact `$testDate` output.
2. Set `自動化測試 commit` to the exact `$testCommit` output and describe it as the adult-off 6/6 E2E implementation commit.
3. Replace the E2E line with the following exact measured-result wording:

```markdown
- E2E tests：PASS；45 runs：18 adult-on 結局路線 + 18 adult-off 結局路線 + 6 responsive runs + 3 sixth-room runs。
- Adult-off 六結局：PASS；Room A／Room B 的 main、normal、intimacy 各於 3 個 viewport 完成，共 18 runs；所有路線均無 `/adult/` request，兩個親密結局分別使用 `a_safe_06` 與 `b_safe_06`。
```

4. Remove only the adult-off `NOT RUN` bullet from `尚未解除的阻擋`.
5. Leave the player-evidence and art-evidence fields as `NOT RUN` and leave their blocker bullets unchanged.

- [ ] **Step 3: Update only the satisfied Godot gate criterion**

In `docs/decisions/godot-migration-gate.md`:

1. Add an evidence sentence after the existing automated baseline. Insert the exact `$testDate` and `$testCommit` values resolved in Step 1, and state that the adult-off matrix completed 18 runs with zero `/adult/` requests and safe intimacy result assets.
2. Replace the unchecked adult-on/off criterion with:

```markdown
- [x] 六個結局在成人內容開啟與關閉時都可完成；adult-off E2E 以 Room A／Room B 的 main、normal、intimacy × 3 個 viewport 完成 18 runs，所有路線均無 `/adult/` request，兩個親密結局分別使用 `a_safe_06` 與 `b_safe_06`。
```

3. Keep `APPROVE Godot migration plan` unchecked.
4. Keep `CONTINUE Web iteration` checked.
5. Keep every human-playtest and formal-art criterion unchecked.

- [ ] **Step 4: Run documentation and consistency checks**

Run:

```powershell
npm --prefix prototype-web test -- tests/unit/documentation.test.ts
rg -n '\$testDate|\$testCommit' docs/qa/web-prototype-acceptance-report.md docs/decisions/godot-migration-gate.md
rg -n 'Adult-off 六結局|45 runs|18 runs|a_safe_06|b_safe_06' docs/qa/web-prototype-acceptance-report.md docs/decisions/godot-migration-gate.md
rg -n 'APPROVE Godot migration plan|CONTINUE Web iteration' docs/decisions/godot-migration-gate.md
git diff --check
```

Expected:

- `documentation.test.ts` passes.
- The unresolved-plan-notation scan returns no matches.
- Evidence terms appear in both documents.
- `APPROVE Godot migration plan` remains `[ ]`; `CONTINUE Web iteration` remains `[x]`.
- `git diff --check` exits `0`.

- [ ] **Step 5: Review and commit the evidence documents**

Run:

```powershell
git status --short
git diff -- docs/qa/web-prototype-acceptance-report.md docs/decisions/godot-migration-gate.md
```

Expected: only the two listed documentation files differ from Task 2's committed state, and neither claims that human playtesting, art approval, or Godot migration is complete.

Commit:

```powershell
git add -- docs/qa/web-prototype-acceptance-report.md docs/decisions/godot-migration-gate.md
git commit -m "docs: record adult-off six-ending evidence"
```

---

### Task 4: Verify the Complete Committed Result

**Files:**
- Verify: `prototype-web/tests/e2e/ending-routes.ts`
- Verify: `prototype-web/tests/e2e/room-a.spec.ts`
- Verify: `prototype-web/tests/e2e/room-b.spec.ts`
- Verify: `prototype-web/tests/e2e/adult-toggle.spec.ts`
- Verify: `docs/qa/web-prototype-acceptance-report.md`
- Verify: `docs/decisions/godot-migration-gate.md`

**Interfaces:**
- Consumes: all committed outputs from Tasks 1-3.
- Produces: fresh full-repository validation evidence for the final HEAD; no additional code interface.

- [ ] **Step 1: Run the repository's complete automated validation on committed HEAD**

Run:

```powershell
npm --prefix prototype-web run check
```

Expected:

- Content validation: both rooms valid with 24 authored cards and 3 endings.
- Asset validation: PASS in `greybox` mode.
- Unit/component tests: `31 passed` test files and `201 passed` tests.
- Production build: PASS and `prototype-web/dist/index.html` exists.
- Playwright E2E: `45 passed`, including the 18 adult-off runs.

If the command fails or the measured counts differ, do not claim completion and do not rewrite the acceptance report to expected values. Preserve the output, invoke `systematic-debugging`, and correct either the implementation or the evidence before rerunning the full command.

- [ ] **Step 2: Verify commit scope, evidence consistency, and clean status**

Run:

```powershell
git log -4 --oneline --decorate
git show --stat --oneline HEAD~2..HEAD
git diff --check HEAD~3 HEAD
git status --short --branch
```

Expected:

- The recent history contains the shared-fixture, adult-off matrix, and evidence-document commits after the approved design and plan commits.
- `git diff --check HEAD~3 HEAD` exits `0`.
- The working tree is clean.
- Local `main` may be ahead of `origin/main`; this plan does not push or publish.

- [ ] **Step 3: Stop before manual QA or publication**

Do not start a local manual-QA server, ask the user to test `localhost`, deploy GitHub Pages, push, or approve Godot migration. Report the completed automated scope and offer publication or online manual QA only as a separate, explicitly authorized next step.
