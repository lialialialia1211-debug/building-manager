# Office Comic Builder Rebuild Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the legacy building/room prototype with a single adult office-comic episode builder that accepts eight cards, resolves one perfect route or one of ten directed side routes, reveals panels in sequence, and remains fully usable while final art is still being produced.

**Architecture:** Keep the existing React/Vite/TypeScript toolchain, but replace the legacy application, content, tests, and validation scripts with a small feature-oriented implementation. Put episode facts in one validated JSON document, keep route resolution and builder manipulation as pure domain functions, use a compact Zustand store for navigation and persistence, and isolate missing-art behavior in one reusable image component. Runtime references use stable art IDs from the approved production package so the art team can replace placeholders without code changes.

**Tech Stack:** React 19, TypeScript, Zustand, Zod, Vite, Vitest, Testing Library, Playwright

---

## Scope and invariants

- The app starts with an adult-content confirmation and then goes directly to the office comic builder.
- The builder has exactly eight editable slots grouped as `2 / 1 / 2 / 3`.
- The tray has exactly thirteen unique cards: five adult office-AU character placeholders, four scene cards, and four prop cards.
- The perfect route requires an exact ordered eight-card fingerprint.
- Every non-perfect valid arrangement must contain exactly two distinct character cards and resolves to one of twenty directed side variants across ten unordered pairs.
- Invalid submissions explain the error and return to the unchanged arrangement.
- Perfect ending: twelve frames, displayed as three pages of four frames.
- Side ending: four frames, displayed as one page.
- Dialogue and captions are HTML text overlays, never baked into art.
- Missing runtime art renders a deterministic labeled placeholder with the same aspect ratio.
- New local-storage keys are namespaced for this rewrite and do not migrate or overwrite legacy saves.
- The tracked legacy room/building content and tests are removed only where they belong to the retired application. The untracked `prototype-web/dist-sfw/` directory remains untouched.
- No new npm dependency is introduced.

## Stable domain contract

```ts
export type CardKind = "character" | "scene" | "prop";

export interface ComicCard {
  id: string;
  kind: CardKind;
  title: string;
  shortLabel: string;
  artId: string;
  characterId?: string;
}

export interface DirectedSideRoute {
  id: string;
  leadCharacterId: string;
  partnerCharacterId: string;
  title: string;
  dialogue: readonly [string, string];
  endingArtIds: readonly [string, string, string, string];
}

export interface OfficeEpisode {
  schemaVersion: 1;
  id: "office-comic-episode-01";
  title: string;
  fixedOpeningArtId: string;
  cards: readonly ComicCard[];
  perfectFingerprint: readonly [
    string, string, string, string,
    string, string, string, string
  ];
  perfectEnding: {
    id: string;
    title: string;
    revealDialogue: readonly [string, string];
    endingArtIds: readonly [
      string, string, string, string,
      string, string, string, string,
      string, string, string, string
    ];
  };
  sideRoutes: readonly DirectedSideRoute[];
}

export type RouteResolution =
  | { kind: "perfect"; routeId: string }
  | {
      kind: "side";
      routeId: string;
      leadCharacterId: string;
      partnerCharacterId: string;
    }
  | {
      kind: "invalid";
      reason: "incomplete" | "unknown-card" | "duplicate-card" | "character-count";
    };
```

Lead direction is determined by the first character card in slot order. This makes all twenty directed variants reachable without adding a second selection step.

## Runtime asset contract

- Runtime path: `/assets/office-comic/<art-id>.png`.
- Art IDs are the approved IDs in
  `docs/art/2026-07-27-office-comic-production-package/05-export-naming-qa.md`.
- `office-asset-plan.json` is the machine-readable source of truth for expected dimensions and use.
- Missing files are allowed during art production, but unknown or duplicate art IDs are validation errors.
- `AssetImage` owns load failure handling; consumers never implement their own placeholder.

---

### Task 1: Establish the new episode schema and content

**Files:**

- Create: `prototype-web/src/domain/episode-schema.ts`
- Create: `prototype-web/src/domain/load-episode.ts`
- Create: `content/office-episode.json`
- Create: `content/office-asset-plan.json`
- Create: `prototype-web/tests/episode-schema.test.ts`
- Remove: tracked legacy room JSON and legacy asset manifests superseded by these two files

**Step 1: Write the failing schema tests**

Test that the checked-in episode:

- parses successfully;
- has thirteen unique cards split `5 / 4 / 4`;
- has an eight-item unique perfect fingerprint;
- has twenty directed side routes covering every ordered pair of five characters;
- has twelve perfect-ending art IDs and four per side route;
- references only IDs in `office-asset-plan.json`.

Also mutate a fixture to prove duplicate card IDs, incomplete pair coverage, and unknown asset references fail.

Run:

```powershell
npm --prefix prototype-web test -- episode-schema.test.ts
```

Expected: FAIL because the schema and content do not exist.

**Step 2: Implement the minimum schema and loader**

- Use Zod for field-level parsing.
- Add one `superRefine` for uniqueness, exact card-kind counts, perfect fingerprint membership, and ordered-pair coverage.
- Expose `parseOfficeEpisode(input: unknown): OfficeEpisode`.
- Load `/office-episode.json` with an abortable `fetchOfficeEpisode(signal?)`.
- Return clear typed errors for network and schema failures.

**Step 3: Populate content from the approved art package**

- Use the five approved adult office-AU placeholders:
  male Rover, female Rover, Xiangli Yao, Changli, and Aleph-1.
- Transcribe the perfect fingerprint, twenty directed pair dialogues, ending IDs, and titles from the art production package.
- Keep all dialogue in content JSON so copy can be revised without rebuilding layouts.
- Generate no image files; declare their paths and dimensions only.

**Step 4: Run tests and self-review**

```powershell
npm --prefix prototype-web test -- episode-schema.test.ts
rg "TODO|TBD|FIXME|placeholder dialogue" prototype-web/src/domain content/office-*.json
```

Expected: tests PASS and the review search returns no unfinished implementation marker.

**Step 5: Commit**

```powershell
git add prototype-web/src/domain/episode-schema.ts prototype-web/src/domain/load-episode.ts prototype-web/tests/episode-schema.test.ts content/office-episode.json content/office-asset-plan.json
git commit -m "feat: define office comic episode content"
```

---

### Task 2: Implement route resolution with exhaustive tests

**Files:**

- Create: `prototype-web/src/domain/route-resolver.ts`
- Create: `prototype-web/tests/route-resolver.test.ts`

**Step 1: Write failing tests**

Cover:

- exact perfect fingerprint;
- all twenty directed character pairs;
- first character in slot order becoming the lead;
- non-character cards not affecting lead direction;
- incomplete, unknown, duplicate, and wrong-character-count failures;
- perfect fingerprint winning before side-route matching.

Use a loop over the content’s side routes so future missing coverage fails loudly.

Run:

```powershell
npm --prefix prototype-web test -- route-resolver.test.ts
```

Expected: FAIL because the resolver does not exist.

**Step 2: Implement the pure resolver**

```ts
export function resolveRoute(
  slots: readonly (string | null)[],
  episode: OfficeEpisode,
): RouteResolution;
```

Validation order:

1. exactly eight filled slots;
2. every ID exists;
3. every ID is unique;
4. exact ordered perfect fingerprint;
5. exactly two distinct character cards;
6. directed pair lookup.

The function must not inspect UI state, local storage, or asset availability.

**Step 3: Run tests and self-review**

```powershell
npm --prefix prototype-web test -- route-resolver.test.ts
```

Expected: PASS.

Review branch ordering against the validation contract and prove every return variant has a test.

**Step 4: Commit**

```powershell
git add prototype-web/src/domain/route-resolver.ts prototype-web/tests/route-resolver.test.ts
git commit -m "feat: resolve perfect and side comic routes"
```

---

### Task 3: Implement eight-slot builder state and persistence

**Files:**

- Create: `prototype-web/src/domain/builder-state.ts`
- Create: `prototype-web/src/domain/persistence.ts`
- Create: `prototype-web/tests/builder-state.test.ts`
- Create: `prototype-web/tests/persistence.test.ts`

**Step 1: Write failing builder-state tests**

Cover:

- empty eight-slot creation;
- placing into an explicit slot;
- click placement into the first empty slot;
- moving a card between slots;
- swapping two occupied slots;
- returning a slotted card to the tray;
- rejecting unknown and duplicate cards;
- preserving all slots after an invalid submission.

**Step 2: Write failing persistence tests**

Use key `office-comic-builder:v1`. Cover:

- age confirmation;
- eight slots;
- unlocked route IDs;
- corrupt JSON fallback;
- invalid or obsolete schema fallback;
- no read or write of the old application key.

Run:

```powershell
npm --prefix prototype-web test -- builder-state.test.ts persistence.test.ts
```

Expected: FAIL.

**Step 3: Implement immutable helpers and validated save data**

```ts
export type BuilderSlots = readonly [
  string | null, string | null, string | null, string | null,
  string | null, string | null, string | null, string | null
];

export function placeCard(...): BuilderSlots;
export function moveCard(...): BuilderSlots;
export function removeCard(...): BuilderSlots;
export function firstOpenSlot(...): number | null;
```

Persistence writes only after validation and catches storage quota/security failures without breaking the session.

**Step 4: Run tests and self-review**

```powershell
npm --prefix prototype-web test -- builder-state.test.ts persistence.test.ts
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add prototype-web/src/domain/builder-state.ts prototype-web/src/domain/persistence.ts prototype-web/tests/builder-state.test.ts prototype-web/tests/persistence.test.ts
git commit -m "feat: add comic builder state and saves"
```

---

### Task 4: Replace the application store and screen flow

**Files:**

- Replace: `prototype-web/src/app/store.ts`
- Replace: `prototype-web/src/app/App.tsx`
- Create: `prototype-web/src/app/app-types.ts`
- Create: `prototype-web/tests/store.test.ts`
- Create: `prototype-web/tests/app-flow.test.tsx`
- Remove: legacy room-engine, building, gallery, settings, and navigation source modules

**Step 1: Write failing store tests**

The new store owns:

```ts
type AppScreen = "age-gate" | "builder" | "reveal" | "ending" | "error";

interface AppState {
  screen: AppScreen;
  episode: OfficeEpisode | null;
  slots: BuilderSlots;
  resolution: RouteResolution | null;
  revealStep: 0 | 1 | 2 | 3 | 4;
  unlockedRouteIds: readonly string[];
}
```

Test:

- content load success/failure/retry;
- age-gate transition;
- placing/moving/removing cards;
- invalid submission returning to the builder with slots preserved;
- valid submission entering reveal;
- sequential reveal completion entering ending;
- route unlock persistence;
- restart preserving saved slots and unlocks.

**Step 2: Write the failing top-level app-flow tests**

Mock episode fetch and verify the visible flow:

1. loading;
2. age gate;
3. builder;
4. invalid explanation;
5. retryable content error.

Run:

```powershell
npm --prefix prototype-web test -- store.test.ts app-flow.test.tsx
```

Expected: FAIL.

**Step 3: Implement the compact store and root switch**

- Remove all legacy room/building/gallery/settings state.
- Keep route resolution in the pure domain module.
- Persist through the persistence adapter after every relevant mutation.
- Keep invalid reasons as domain codes and map them to Traditional Chinese in UI.
- Add an error boundary around the root application.

**Step 4: Run tests and self-review**

```powershell
npm --prefix prototype-web test -- store.test.ts app-flow.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add prototype-web/src/app prototype-web/src/domain prototype-web/tests
git commit -m "feat: replace legacy app flow with comic builder"
```

---

### Task 5: Build the accessible comic-card editor

**Files:**

- Create: `prototype-web/src/components/AssetImage.tsx`
- Create: `prototype-web/src/components/AgeGate.tsx`
- Create: `prototype-web/src/components/CardTray.tsx`
- Create: `prototype-web/src/components/ComicPanelSlot.tsx`
- Create: `prototype-web/src/components/ComicBuilderScreen.tsx`
- Create: `prototype-web/tests/asset-image.test.tsx`
- Create: `prototype-web/tests/comic-builder.test.tsx`

**Step 1: Write failing component tests**

Cover:

- missing image falling back to a labeled placeholder;
- three tray tabs and correct `5 / 4 / 4` counts;
- used cards becoming unavailable in the tray;
- click-to-first-open-slot;
- slot removal and movement;
- keyboard activation with Enter/Space;
- submit disabled until eight slots are filled;
- panel grouping labels `第一幕 / 第二幕 / 第三幕 / 第四幕`;
- fixed opening panel and locked sixth-panel teaser.

Run:

```powershell
npm --prefix prototype-web test -- asset-image.test.tsx comic-builder.test.tsx
```

Expected: FAIL.

**Step 2: Implement semantic interaction**

- Use native buttons for all click targets.
- Use HTML drag/drop as an enhancement, never as the only interaction.
- Every slot gets an accessible name, state, and remove action.
- Expose selected card and destination controls clearly at 1280×720.
- Set `aria-live="polite"` for placement and validation feedback.
- Keep the exact stable art ID visible inside fallbacks for handoff debugging.

**Step 3: Run tests and self-review**

```powershell
npm --prefix prototype-web test -- asset-image.test.tsx comic-builder.test.tsx
```

Expected: PASS.

Check focus order, button labels, and that drag/drop paths call the same tested store actions as click placement.

**Step 4: Commit**

```powershell
git add prototype-web/src/components prototype-web/tests
git commit -m "feat: build accessible eight-card comic editor"
```

---

### Task 6: Build sequential reveal and ending readers

**Files:**

- Create: `prototype-web/src/domain/dialogue.ts`
- Create: `prototype-web/src/components/DialogueOverlay.tsx`
- Create: `prototype-web/src/components/RevealSequence.tsx`
- Create: `prototype-web/src/components/EndingReader.tsx`
- Create: `prototype-web/tests/dialogue.test.ts`
- Create: `prototype-web/tests/reveal-sequence.test.tsx`
- Create: `prototype-web/tests/ending-reader.test.tsx`

**Step 1: Write failing tests**

Cover:

- every reveal grid has at most two dialogue lines;
- every directed route resolves its approved two-line exchange;
- panels two through five reveal in order;
- reduced-motion mode skips timed animation but preserves order;
- perfect ending paginates `4 / 4 / 4`;
- side ending displays four frames on one page;
- previous/next controls clamp correctly;
- restart returns to the builder and retains the arrangement.

Use fake timers only for reveal sequencing; do not assert animation implementation details.

Run:

```powershell
npm --prefix prototype-web test -- dialogue.test.ts reveal-sequence.test.tsx ending-reader.test.tsx
```

Expected: FAIL.

**Step 2: Implement reveal behavior**

- Reveal one panel per user action after a brief presentation delay.
- Never rely on sound to communicate progression.
- Use `prefers-reduced-motion` to remove transforms/fades.
- Render dialogue as text overlays using content data.
- Unlock the resolved ending when panel six is shown.

**Step 3: Implement ending readers**

- Perfect reader: three page groups, four art frames each.
- Side reader: one four-frame page.
- Render route title, lead/partner labels, progress, restart, and back-to-builder actions.
- Missing art uses `AssetImage`; it never blocks page navigation.

**Step 4: Run tests and self-review**

```powershell
npm --prefix prototype-web test -- dialogue.test.ts reveal-sequence.test.tsx ending-reader.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add prototype-web/src/domain/dialogue.ts prototype-web/src/components prototype-web/tests
git commit -m "feat: add comic reveal and ending readers"
```

---

### Task 7: Replace legacy styling and make the target viewports usable

**Files:**

- Replace: `prototype-web/src/styles/global.css`
- Create: `prototype-web/src/styles/office-comic.css`
- Remove: superseded legacy style sheets
- Update: `prototype-web/src/main.tsx`
- Create: `prototype-web/tests/layout-contract.test.tsx`

**Step 1: Write a failing layout contract test**

Verify structural class hooks and accessible regions for:

- header/status;
- fixed opening panel;
- four slot groups;
- card tray;
- validation/status area;
- ending pager.

This is not pixel comparison; it protects the layout contract.

**Step 2: Implement the new visual system**

- Neutral dark office-comic framing with high-contrast text.
- No prescriptive character illustration style; final art stays entirely inside asset frames.
- Desktop layout optimized for 1920×1080 and 1280×720.
- Steam Deck layout optimized for 1280×800.
- Narrow viewports become a single vertical flow without horizontal page scrolling.
- Use CSS aspect ratios matching `office-asset-plan.json`.
- Respect reduced motion and visible focus.

**Step 3: Run tests and build**

```powershell
npm --prefix prototype-web test -- layout-contract.test.tsx
npm --prefix prototype-web run build
```

Expected: PASS.

**Step 4: Commit**

```powershell
git add prototype-web/src/styles prototype-web/src/main.tsx prototype-web/tests/layout-contract.test.tsx
git commit -m "feat: style responsive office comic experience"
```

---

### Task 8: Replace content and asset validation

**Files:**

- Replace: `prototype-web/scripts/validate-content.ts`
- Replace: `prototype-web/scripts/validate-assets.ts`
- Replace or remove: legacy asset sync/check scripts no longer referenced by npm scripts
- Update: `prototype-web/package.json`
- Create: `prototype-web/tests/validation-scripts.test.ts`

**Step 1: Write failing validator tests**

Use temporary fixtures to prove:

- malformed episode JSON fails;
- incomplete directed-pair coverage fails;
- unknown art references fail;
- duplicate art IDs fail;
- art plans with invalid dimensions fail;
- absent planned art files report as pending rather than failing;
- present files with an unexpected extension or bad dimensions fail.

**Step 2: Implement validators**

- `validate-content` imports the same Zod schema used by runtime.
- `validate-assets` validates the plan, checks all runtime references, and inspects only files that currently exist.
- Print a concise pending-art summary grouped by category.
- Exit nonzero for structural errors, never merely because the art team is still working.

**Step 3: Simplify npm scripts**

Keep:

- `test`
- `test:e2e`
- `build`
- `build:pages`
- `validate:content`
- `validate:assets`
- `check`

Make `check` execute content validation, asset validation, unit/component tests, production build, and E2E in that order.

**Step 4: Verify**

```powershell
npm --prefix prototype-web test -- validation-scripts.test.ts
npm --prefix prototype-web run validate:content
npm --prefix prototype-web run validate:assets
```

Expected: PASS, with pending-art counts but no false failure.

**Step 5: Commit**

```powershell
git add prototype-web/scripts prototype-web/package.json prototype-web/tests/validation-scripts.test.ts
git commit -m "build: validate office comic content and art plan"
```

---

### Task 9: Replace legacy E2E coverage

**Files:**

- Replace: `prototype-web/e2e/app.spec.ts`
- Create: `prototype-web/e2e/helpers.ts`
- Remove: superseded legacy E2E specifications

**Step 1: Write E2E scenarios**

Cover on the configured desktop and Steam Deck projects:

1. adult gate to builder;
2. exact fingerprint to twelve-frame perfect ending;
3. one side route in each direction to prove lead ordering;
4. invalid one-character and three-character arrangements with slot preservation;
5. click placement and drag/drop parity;
6. refresh persistence;
7. missing-art placeholder behavior;
8. keyboard-only core flow;
9. no viewport-level horizontal overflow.

**Step 2: Run and fix only product defects**

```powershell
npm --prefix prototype-web run test:e2e
```

Expected: PASS across all configured projects.

Do not weaken assertions or disable a browser project to hide a defect.

**Step 3: Commit**

```powershell
git add prototype-web/e2e
git commit -m "test: cover office comic journeys end to end"
```

---

### Task 10: Full verification and code review

**Files:**

- Update as needed: implementation and tests found by verification

**Step 1: Run the required repository validation**

```powershell
npm --prefix prototype-web run check
```

Expected: all validators, tests, build, and Playwright scenarios PASS.

**Step 2: Inspect the final diff**

```powershell
git status --short
git diff --stat HEAD~1
git diff --check
rg "building|room-|gallery|settings" prototype-web/src prototype-web/tests prototype-web/e2e
```

Expected:

- only intended legacy references are absent or limited to explanatory text;
- no whitespace errors;
- `prototype-web/dist-sfw/` remains untracked and unmodified.

**Step 3: Request an independent code review**

Use the `superpowers:requesting-code-review` workflow against the implementation range. Resolve all confirmed high- and medium-severity findings, add regression tests, and rerun the complete `check`.

**Step 4: Commit verification fixes**

```powershell
git add <only-the-reviewed-files>
git commit -m "fix: harden office comic builder"
```

Skip this commit if no file changed.

---

### Task 11: Deploy the exact tested commit for manual QA

**Files:**

- Create: `docs/qa/2026-07-28-office-comic-preview.md`

**Step 1: Record the verified commit**

```powershell
git rev-parse HEAD
git status --short
```

The worktree must contain no uncommitted implementation change. The unrelated untracked `prototype-web/dist-sfw/` may remain.

**Step 2: Build the GitHub Pages artifact**

```powershell
npm --prefix prototype-web run build:pages
```

Deploy only the output produced from the verified commit to the repository’s GitHub-hosted preview mechanism. Do not use localhost for human QA.

**Step 3: Open and smoke-check the public URL**

Open the exact GitHub preview URL and confirm:

- age gate loads;
- builder loads after confirmation;
- planned art placeholders render;
- no blocking network or JavaScript error appears.

**Step 4: Write the QA record**

Record:

- deployed commit SHA;
- preview URL;
- deployment timestamp;
- automated `check` result;
- smoke-check result;
- known limitation: final art is pending and placeholders are intentional.

**Step 5: Commit the QA record if deployment state permits**

```powershell
git add docs/qa/2026-07-28-office-comic-preview.md
git commit -m "docs: record office comic preview"
```

If adding the QA record creates a new commit after deployment, do not claim that documentation-only commit is the tested application commit; record both SHAs explicitly.

---

## Final acceptance checklist

- [ ] The legacy building/room navigation is absent from the runtime.
- [ ] The adult gate leads directly to a single office episode.
- [ ] Thirteen cards and eight slots match the approved spec.
- [ ] Exact perfect fingerprint and all twenty directed side variants are tested.
- [ ] Invalid routes preserve the current arrangement.
- [ ] Dialogue is content-driven HTML overlay text.
- [ ] Perfect ending has twelve frames; every side ending has four.
- [ ] Missing art has stable, labeled, correctly sized fallbacks.
- [ ] Save data is namespaced and corrupt-save safe.
- [ ] 1920×1080, 1280×720, and 1280×800 automated journeys pass.
- [ ] `npm --prefix prototype-web run check` passes from the verified commit.
- [ ] The exact tested commit is deployed to a GitHub-hosted preview.
- [ ] The preview URL and commit are recorded before manual QA handoff.
