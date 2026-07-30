# Four-Slot Story Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the eight-slot ordered builder with a four-slot free-placement builder that gives two main-route hints, resolves the main route without regard to order, guarantees a directed side-route CG for any valid selection containing at least two characters, and reveals all four panels plus the route CG automatically.

**Architecture:** Keep the existing domain/UI/store separation. The domain layer owns the exact four-slot tuple, set-based main-route matching, directed side-route selection, one-card-per-panel dialogue, and v1-to-v2 save migration; React renders the four unrestricted slots and drives the existing reveal step through timers. The episode JSON remains the content source and defines the four-card main-route fingerprint plus the complete directed side-route table.

**Tech Stack:** TypeScript 7, React 19, Zustand 5, Zod 4, Vitest 4, Testing Library, Playwright 1.61, Vite 8

## Global Constraints

- Exactly four player-placeable slots; every slot accepts character, scene, or prop cards.
- Keep all 13 selectable cards (5 characters, 4 scenes, 4 props), so the candidate pool remains larger than the four slots.
- A card cannot appear in more than one slot.
- Slot 1 displays `主線似乎需要兩名人物`; slot 3 displays `再放入一個場景與一件關鍵物品`. These hints never restrict placement.
- The main route is the unordered set `card_char_male_rover`, `card_char_changli`, `card_scene_boss_office`, `card_prop_merger_contract`.
- Every non-main selection with at least two characters resolves a side route. The first two characters in slot order determine lead, partner, route title, and dialogue; third and fourth characters cannot invalidate the route.
- Selections with zero or one character remain in the builder and display a clear reorder/reselection message.
- Pressing `演下去` opens the reveal screen, automatically reveals four panels in order, then shows the route CG and enables `閱讀後續`.
- With `prefers-reduced-motion: reduce`, all panels and the route CG appear immediately.
- Reversing the first two characters changes the directed route copy but reuses the same CG and ending art.
- Loading a schema-version-1 eight-slot save resets only the arrangement to four empty slots and preserves age confirmation and unlocked route IDs.
- Do not add dependencies or change the existing 13-card/20-directed-route content model.
- Completion requires `npm --prefix prototype-web run check`.
- Manual QA must use a GitHub-hosted preview of the exact tested commit.

---

### Task 1: Four-Slot State and Episode Contract

**Files:**
- Modify: `prototype-web/src/domain/builder-state.ts`
- Modify: `prototype-web/src/domain/episode-schema.ts`
- Modify: `content/office-comic/office-episode.json`
- Modify: `prototype-web/tests/builder-state.test.ts`
- Modify: `prototype-web/tests/episode-schema.test.ts`

**Interfaces:**
- Produces: `BuilderSlots`, a readonly tuple of exactly four `string | null` values.
- Produces: `createEmptySlots(): BuilderSlots`.
- Produces: `OfficeEpisode['perfectFingerprint']`, a tuple of exactly four card IDs.
- Preserves: `placeCard`, `moveCard`, and `removeCard` signatures and no-duplicate behavior.

- [ ] **Step 1: Change the state and schema tests to require four slots**

Update builder tests to assert:

```ts
expect(createEmptySlots()).toEqual([null, null, null, null])
expect(placeCard(createEmptySlots(), 'character-a', knownIds, 3)).toEqual([
  null,
  null,
  null,
  'character-a',
])
expect(moveCard(['a', 'b', 'c', 'd'], 0, 3)).toEqual([
  'd',
  'b',
  'c',
  'a',
])
```

Update episode-schema fixtures and assertions so `perfectFingerprint` contains exactly:

```ts
[
  'card_char_male_rover',
  'card_char_changli',
  'card_scene_boss_office',
  'card_prop_merger_contract',
]
```

- [ ] **Step 2: Run focused tests and confirm the eight-slot implementation fails**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/builder-state.test.ts tests/episode-schema.test.ts
```

Expected: failures show eight returned positions and/or an eight-item fingerprint requirement.

- [ ] **Step 3: Implement the exact four-slot contract**

Change `BuilderSlots`, `createEmptySlots`, `isSlotIndex`, and `asBuilderSlots` to use four positions:

```ts
export type BuilderSlots = readonly [
  string | null,
  string | null,
  string | null,
  string | null,
]

export function createEmptySlots(): BuilderSlots {
  return [null, null, null, null]
}

function isSlotIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < 4
}
```

Change `perfectFingerprint` in the Zod episode schema to a four-string tuple, and replace the JSON fingerprint with the four approved IDs. Do not remove any card or side route.

- [ ] **Step 4: Run the focused tests**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/builder-state.test.ts tests/episode-schema.test.ts
```

Expected: both files pass.

- [ ] **Step 5: Commit the four-slot contract**

```powershell
git add prototype-web/src/domain/builder-state.ts prototype-web/src/domain/episode-schema.ts content/office-comic/office-episode.json prototype-web/tests/builder-state.test.ts prototype-web/tests/episode-schema.test.ts
git commit -m "feat: reduce comic builder to four slots"
```

### Task 2: Deterministic Main and Side Route Resolution

**Files:**
- Modify: `prototype-web/src/domain/route-resolver.ts`
- Modify: `prototype-web/src/domain/dialogue.ts`
- Modify: `prototype-web/tests/route-resolver.test.ts`
- Modify: `prototype-web/tests/dialogue.test.ts`

**Interfaces:**
- Consumes: four-card `BuilderSlots` and the four-card `OfficeEpisode['perfectFingerprint']`.
- Produces: `resolveRoute(slots, episode): RouteResolution`.
- Produces: invalid reason `route-data` when the episode lacks the required directed side route.
- Preserves: `RouteResolution` side results with `leadCharacterId` and `partnerCharacterId`.
- Produces: `buildRevealPanels(slots, episode, resolution)`, exactly four panels in slot order.

- [ ] **Step 1: Write route tests for unordered main matching and forgiving side routing**

Add tests that cover all 24 permutations of the main set:

```ts
for (const slots of permutations([
  'card_char_male_rover',
  'card_char_changli',
  'card_scene_boss_office',
  'card_prop_merger_contract',
])) {
  expect(resolveRoute(slots, episode)).toEqual({
    kind: 'perfect',
    routeId: episode.perfectEnding.id,
  })
}
```

Add explicit assertions for:

```ts
expect(resolveRoute([
  'card_char_shorekeeper',
  'card_scene_boss_office',
  'card_char_male_rover',
  'card_prop_merger_contract',
], episode)).toMatchObject({
  kind: 'side',
  leadCharacterId: 'shorekeeper',
  partnerCharacterId: 'male_rover',
})

expect(resolveRoute([
  'card_char_changli',
  'card_char_shorekeeper',
  'card_char_female_rover',
  'card_char_camellya',
], episode)).toMatchObject({
  kind: 'side',
  leadCharacterId: 'changli',
  partnerCharacterId: 'shorekeeper',
})
```

Also assert that zero or one character returns `character-count`, and reversing the first two character cards returns the reversed directed route ID.
Iterate all 20 entries in `episode.sideRoutes`, build a four-card selection whose
first two characters match each entry, and assert the returned `routeId` is the
entry's ID.

- [ ] **Step 2: Write dialogue tests for one card per panel**

Replace eight-card reveal fixtures with four-card fixtures. Assert:

```ts
const panels = buildRevealPanels(slots, episode, resolution)
expect(panels).toHaveLength(4)
expect(panels.map((panel) => panel.cardIds)).toEqual(
  slots.map((cardId) => [cardId]),
)
```

For a three-character side route, assert the first two character panels use the directed pair dialogue and the third character panel uses that card's own line.

- [ ] **Step 3: Run route and dialogue tests to verify they fail**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/route-resolver.test.ts tests/dialogue.test.ts
```

Expected: the current resolver rejects four slots or three characters, and dialogue still groups eight cards.

- [ ] **Step 4: Implement set-based main matching and first-two-character side matching**

In `resolveRoute`:

```ts
const perfectIds = new Set(episode.perfectFingerprint)
const isPerfect = cardIds.length === perfectIds.size
  && cardIds.every((cardId) => perfectIds.has(cardId))

const characterIds = cardIds.flatMap((cardId) => {
  const characterId = cardsById.get(cardId)?.characterId
  return characterId ? [characterId] : []
})

if (characterIds.length < 2) {
  return {
    kind: 'invalid',
    reason: 'character-count',
    characterCount: characterIds.length,
  }
}

const [leadCharacterId, partnerCharacterId] = characterIds
```

Resolve the route with those first two IDs. Return `{ kind: 'invalid', reason: 'route-data' }` instead of throwing when the directed route is absent.

- [ ] **Step 5: Implement four one-card reveal panels**

Iterate all four slot cards in order. For character cards corresponding to the first and second characters, use `route.pairDialogue[0]` and `[1]`; for extra character cards and all non-character cards, use the card's own `line`. Each result must retain the existing `RevealPanel` shape with one ID in `cardIds`.

- [ ] **Step 6: Run route and dialogue tests**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/route-resolver.test.ts tests/dialogue.test.ts
```

Expected: all permutations, character counts, direction, and panel assertions pass.

- [ ] **Step 7: Commit deterministic routing**

```powershell
git add prototype-web/src/domain/route-resolver.ts prototype-web/src/domain/dialogue.ts prototype-web/tests/route-resolver.test.ts prototype-web/tests/dialogue.test.ts
git commit -m "feat: make four-card story routing deterministic"
```

### Task 3: Preserve Progress While Migrating Eight-Slot Saves

**Files:**
- Modify: `prototype-web/src/domain/persistence.ts`
- Modify: `prototype-web/src/app/store.ts`
- Modify: `prototype-web/tests/persistence.test.ts`
- Modify: `prototype-web/tests/store.test.ts`

**Interfaces:**
- Produces: current `ComicSave` with `schemaVersion: 2` and four-slot `BuilderSlots`.
- Consumes: legacy schema-version-1 saves with eight slots from the unchanged storage key `office-comic-builder:v1`.
- Produces: `loadComicSave()` that preserves `ageConfirmed` and `unlockedRouteIds` while replacing legacy slots with `createEmptySlots()`.
- Produces: store initialization that clears a current save's arrangement when it contains an unknown or duplicate card, without clearing age confirmation or unlocked routes.
- Produces: `ComicAppState.revealAll(): void`, setting `revealStep` to `4` only on a valid reveal screen.

- [ ] **Step 1: Write migration and current-save tests**

Add a legacy save test:

```ts
storage.setItem(COMIC_SAVE_KEY, JSON.stringify({
  schemaVersion: 1,
  ageConfirmed: true,
  slots: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
  unlockedRouteIds: ['side_male_rover_changli'],
}))

expect(loadComicSave(storage)).toEqual({
  schemaVersion: 2,
  ageConfirmed: true,
  slots: [null, null, null, null],
  unlockedRouteIds: ['side_male_rover_changli'],
})
```

Update current-save tests to persist `schemaVersion: 2` and exactly four slots. Keep the corrupted JSON fallback test.

- [ ] **Step 2: Write store tests for v2 persistence and immediate reveal completion**

Assert that placement writes `schemaVersion: 2`. Add:

```ts
store.getState().submit()
store.getState().revealAll()
expect(store.getState().revealStep).toBe(4)
expect(store.getState().screen).toBe('reveal')
```

Also assert `revealAll()` is a no-op before a valid route is submitted.
Create one saved four-slot state with an unknown card and another with a duplicate
card, initialize each store against the real episode fixture, and assert both stores
retain age/unlock state but expose `[null, null, null, null]` as their slots.

- [ ] **Step 3: Run persistence and store tests to verify they fail**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/persistence.test.ts tests/store.test.ts
```

Expected: schema version and tuple length failures, plus missing `revealAll`.

- [ ] **Step 4: Implement dual-schema loading and v2 writing**

Keep `COMIC_SAVE_KEY` unchanged. Define a strict eight-slot `legacyComicSaveSchema` with `schemaVersion: 1` and a strict four-slot `comicSaveSchema` with `schemaVersion: 2`. Parse once:

```ts
const raw = JSON.parse(saved)
const current = comicSaveSchema.safeParse(raw)
if (current.success) return current.data as ComicSave

const legacy = legacyComicSaveSchema.safeParse(raw)
if (legacy.success) {
  return {
    schemaVersion: 2,
    ageConfirmed: legacy.data.ageConfirmed,
    slots: createEmptySlots(),
    unlockedRouteIds: legacy.data.unlockedRouteIds,
  }
}
```

Change `createDefaultSave`, `ComicSave`, and store persistence writes to schema version 2.

- [ ] **Step 5: Sanitize current four-slot saves against the loaded episode**

After `loadEpisode()` succeeds, validate the non-null saved IDs:

```ts
const savedCardIds = state.slots.filter((cardId): cardId is string =>
  cardId !== null
)
const knownCardIds = new Set(episode.cards.map((card) => card.id))
const slotsAreValid = savedCardIds.every((cardId) => knownCardIds.has(cardId))
  && new Set(savedCardIds).size === savedCardIds.length
const slots = slotsAreValid ? state.slots : createEmptySlots()
```

Set the sanitized slots in the initialized state and persist that state when a
reset occurred, preserving `ageConfirmed` and `unlockedRouteIds`.

- [ ] **Step 6: Add `revealAll` without changing ending unlock semantics**

Add `revealAll(): void` to `ComicAppState`. It sets `revealStep: 4` only when the current screen is `reveal` and the current resolution is valid. Keep `advanceReveal()` at step 4 as the sole transition that unlocks and enters the ending.

- [ ] **Step 7: Run persistence and store tests**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/persistence.test.ts tests/store.test.ts
```

Expected: migration, current saves, and reveal state tests pass.

- [ ] **Step 8: Commit migration and reveal state**

```powershell
git add prototype-web/src/domain/persistence.ts prototype-web/src/app/store.ts prototype-web/tests/persistence.test.ts prototype-web/tests/store.test.ts
git commit -m "feat: migrate comic saves to four slots"
```

### Task 4: Four Unrestricted Slots, Two Hints, and Automatic CG Reveal

**Files:**
- Modify: `prototype-web/src/components/ComicBuilderScreen.tsx`
- Modify: `prototype-web/src/components/ComicPanelSlot.tsx`
- Modify: `prototype-web/src/components/RevealSequence.tsx`
- Modify: `prototype-web/src/styles/office-comic.css`
- Modify: `prototype-web/tests/comic-builder.test.tsx`
- Modify: `prototype-web/tests/reveal-sequence.test.tsx`
- Modify: `prototype-web/tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: four-slot store state and `revealAll()`.
- Produces: four visible `comic-panel-slot` controls, each accepting every card kind.
- Produces: optional `hint?: string` on `ComicPanelSlot`.
- Preserves: `演下去` submit and `閱讀後續` ending transition.
- Produces: timer-driven calls to `advanceReveal()` until step 4 and reduced-motion call to `revealAll()`.

- [ ] **Step 1: Write builder tests for four slots, all 13 cards, no duplicates, and two hints**

Assert:

```ts
expect(screen.getAllByTestId('comic-panel-slot')).toHaveLength(4)
expect(screen.getByText('0 / 4 張卡')).toBeInTheDocument()
expect(screen.getByText('主線似乎需要兩名人物')).toBeInTheDocument()
expect(screen.getByText('再放入一個場景與一件關鍵物品')).toBeInTheDocument()
expect(screen.getAllByTestId('card-tray-card')).toHaveLength(13)
```

Click a scene card into slot 1 and a character card into slot 3 to prove hints are non-binding. Assert an already-used card is disabled and cannot be placed twice. Update invalid-route copy expectations so one character tells the player to select or move characters until the first two character cards form the desired pair.
Submit an episode fixture with a deliberately missing directed route and assert
the builder shows `這組人物的支線資料缺漏，請更換人物或調整順序。` instead
of throwing.

- [ ] **Step 2: Write fake-timer reveal tests**

Mock normal motion and assert no manual reveal click is needed:

```ts
vi.useFakeTimers()
window.matchMedia = vi.fn().mockReturnValue({ matches: false })
render(<RevealSequence />)
await vi.advanceTimersByTimeAsync(1_200)
expect(screen.getAllByTestId('revealed-panel')).toHaveLength(4)
expect(screen.getByTestId('route-cg')).toBeInTheDocument()
expect(screen.getByRole('button', { name: '閱讀後續' })).toBeEnabled()
```

Mock reduced motion with `matches: true`, render, and assert the four panels and CG appear without advancing timers.

- [ ] **Step 3: Run component tests and confirm they fail**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/comic-builder.test.tsx tests/reveal-sequence.test.tsx tests/app-flow.test.tsx
```

Expected: current UI renders eight slots, lacks hints, and requires repeated clicks.

- [ ] **Step 4: Render four independent slots and hint copy**

Replace the 2/1/2/3 group configuration with four one-slot entries:

```ts
const slotConfigs = [
  { index: 0, label: '第一格', hint: '主線似乎需要兩名人物' },
  { index: 1, label: '第二格' },
  { index: 2, label: '第三格', hint: '再放入一個場景與一件關鍵物品' },
  { index: 3, label: '第四格' },
] as const
```

Pass `hint` to `ComicPanelSlot`, render it only when the slot is empty, and change the counter and submit-completeness condition to four. Keep `placeCard` free of type checks.

- [ ] **Step 5: Implement automatic sequential reveal**

In `RevealSequence`, use an effect keyed by `revealStep`:

```ts
useEffect(() => {
  if (revealStep >= 4) return
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    revealAll()
    return
  }
  const timer = globalThis.setTimeout(advanceReveal, 220)
  return () => globalThis.clearTimeout(timer)
}, [advanceReveal, revealAll, revealStep])
```

Before step 4, render progress text instead of a reveal button. At step 4, render the route CG and an enabled `閱讀後續` button whose click calls `advanceReveal`. Keep the four panels visually locked until their corresponding step is reached.

- [ ] **Step 6: Adjust responsive styles for four single-panel columns and hint text**

Retain the existing desktop four-column reveal grid. Make builder slot groups a four-column grid at desktop widths, collapse consistently at existing tablet/mobile breakpoints, and add legible `.comic-panel-slot__hint` styling without constraining card placement.

- [ ] **Step 7: Run component tests**

Run:

```powershell
npm --prefix prototype-web test -- --run tests/comic-builder.test.tsx tests/reveal-sequence.test.tsx tests/app-flow.test.tsx
```

Expected: four-slot, hint, no-duplicate, normal-motion, reduced-motion, and ending-transition tests pass.

- [ ] **Step 8: Commit the builder and reveal UI**

```powershell
git add prototype-web/src/components/ComicBuilderScreen.tsx prototype-web/src/components/ComicPanelSlot.tsx prototype-web/src/components/RevealSequence.tsx prototype-web/src/styles/office-comic.css prototype-web/tests/comic-builder.test.tsx prototype-web/tests/reveal-sequence.test.tsx prototype-web/tests/app-flow.test.tsx
git commit -m "feat: add guided four-slot comic flow"
```

### Task 5: Browser Coverage, Full Validation, and GitHub Preview

**Files:**
- Modify: `prototype-web/tests/e2e/app.spec.ts`
- Modify: `docs/qa/2026-07-28-office-comic-preview.md`

**Interfaces:**
- Consumes: the complete four-slot flow.
- Produces: browser tests for unordered main route, two-character side route, extra-character side route, invalid low-character count, persistence migration behavior exposed through the app, and automatic reveal.
- Produces: a GitHub Pages preview for the exact source commit that passed the complete check.

- [ ] **Step 1: Replace eight-card E2E helpers with four-card helpers**

Set the perfect helper to place:

```ts
[
  'card_prop_merger_contract',
  'card_char_changli',
  'card_scene_boss_office',
  'card_char_male_rover',
]
```

This deliberately uses a noncanonical order. Replace the repeated reveal-click helper with a wait for the visible `閱讀後續` button, then click it once.

- [ ] **Step 2: Add side-route and invalid-selection browser cases**

Cover:

```ts
[
  'card_char_shorekeeper',
  'card_scene_boss_office',
  'card_char_male_rover',
  'card_prop_merger_contract',
]
```

and:

```ts
[
  'card_char_changli',
  'card_char_shorekeeper',
  'card_char_female_rover',
  'card_char_camellya',
]
```

Assert both reach a route CG automatically. Use one-character plus three non-character cards to assert the app stays on the builder with the character-count guidance.
For widths 1920×1080, 1280×720, and 1280×800, load the builder and assert
`document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

- [ ] **Step 3: Run E2E tests**

Run:

```powershell
npm --prefix prototype-web run test:e2e
```

Expected: all browser tests pass.

- [ ] **Step 4: Run repository-required validation**

Run:

```powershell
npm --prefix prototype-web run check
```

Expected: content validation, asset validation, Vitest, TypeScript/Vite build, and Playwright all exit 0.

- [ ] **Step 5: Commit the verified source state**

```powershell
git add prototype-web/tests/e2e/app.spec.ts
git commit -m "test: cover four-slot story flow"
git status --short
```

Expected: no uncommitted implementation or test files remain.

- [ ] **Step 6: Push the source branch and deploy that exact commit to GitHub Pages**

Push the current `codex/office-comic-rebuild` branch. Build with:

```powershell
npm --prefix prototype-web run build:pages
```

Copy only the resulting `prototype-web/dist` contents into the existing `gh-pages` worktree, commit them, and push `gh-pages`. Record both source and deployment commit hashes.

- [ ] **Step 7: Verify the hosted preview**

Wait until GitHub Pages reports the deployment built, then open:

```text
https://lialialialia1211-debug.github.io/building-manager/
```

Confirm the page loads, shows four slots and the two hints, accepts a noncanonical perfect route, auto-reveals four panels and the CG, and enters the ending with one `閱讀後續` click.

- [ ] **Step 8: Record QA evidence**

Update the existing QA report with:

```text
Source commit: paste the output of git rev-parse HEAD from the commit that passed npm --prefix prototype-web run check
Deployment commit: paste the output of git rev-parse HEAD from the gh-pages worktree after deployment
Preview URL: https://lialialialia1211-debug.github.io/building-manager/
Automated validation: npm --prefix prototype-web run check (PASS)
Manual smoke test: four slots, two hints, unordered main route, automatic CG reveal (PASS)
```

Commit and push the QA record on `codex/office-comic-rebuild`.
