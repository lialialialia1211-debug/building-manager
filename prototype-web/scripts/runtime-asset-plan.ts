import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Deterministic plan for copying delivered art into the runtime bundle.
// Source of truth: art/deliverables. Front-end only reads content/assets.
// The delivered filenames are already canonical, so the source -> canonical
// mapping is effectively identity; the aliases below stay explicit so future
// re-generations that revert to a_adult_/a_poster_ naming still normalize.

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

const ROOM_FILES = [
  'room_a_blackout',
  'room_b_wall',
] as const

const OPENING_IDS = [
  'a_open_01',
  'a_open_02',
  'a_open_03',
  'b_open_01',
  'b_open_02',
  'b_open_03',
] as const

const ENDING_IDS = [
  'a_ending_main',
  'a_ending_normal',
  'a_ending_intimacy',
  'b_ending_main',
  'b_ending_normal',
  'b_ending_intimacy',
] as const

const SAFE_IDS = ['a', 'b'].flatMap((room) =>
  Array.from(
    { length: 6 },
    (_, index) => `${room}_safe_0${index + 1}`,
  ))

const ADULT_IDS = ['a', 'b'].flatMap((room) =>
  Array.from(
    { length: 6 },
    (_, index) => `${room}_intimacy_0${index + 1}`,
  ))

const SIXTH_IDS = ['sixth_01', 'sixth_02', 'sixth_03'] as const

const BACKGROUND_IDS = ['bg_room_a', 'bg_room_b'] as const

// Canonical id -> delivered source basename. Identity today; kept explicit so a
// regenerated deliverable using legacy names is still normalized to canonical.
function sourceBasename(canonicalId: string): string {
  return canonicalId
    .replace(/^a_adult_/, 'a_intimacy_')
    .replace(/^b_adult_/, 'b_intimacy_')
    .replace(/^a_poster_/, 'a_ending_')
    .replace(/^b_poster_/, 'b_ending_')
}

function commonSourceDir(canonicalId: string): string {
  if (canonicalId.startsWith('a_safe_') || canonicalId.startsWith('b_safe_')) {
    return 'panels/safe'
  }
  if (canonicalId.startsWith('sixth_')) {
    return 'panels/sixth_room'
  }
  if (canonicalId.startsWith('a')) return 'panels/room_a'
  if (canonicalId.startsWith('b')) return 'panels/room_b'
  throw new Error(`cannot resolve source dir for ${canonicalId}`)
}

function readChoicePanelIds(repoRoot: string): string[] {
  const ids = new Set<string>()
  for (const roomId of ROOM_FILES) {
    const room = JSON.parse(
      readFileSync(
        resolve(repoRoot, 'content', 'rooms', `${roomId}.json`),
        'utf8',
      ),
    ) as { nodes: Record<string, { candidates: string[] }> }
    for (const node of Object.values(room.nodes)) {
      for (const candidate of node.candidates) ids.add(candidate)
    }
  }
  return [...ids]
}

function posix(...parts: string[]): string {
  return parts.join('/')
}

export function createRuntimeAssetPlan(
  repoRoot: string,
): RuntimeAssetPlan {
  const choiceIds = readChoicePanelIds(repoRoot)
  const commonPanelIds = [
    ...choiceIds,
    ...OPENING_IDS,
    ...ENDING_IDS,
    ...SAFE_IDS,
    ...SIXTH_IDS,
  ]

  const copies: PlannedCopy[] = []
  const common: Record<string, RuntimeAssetEntry> = {}
  const adult: Record<string, RuntimeAssetEntry> = {}
  const backgrounds: Record<string, string> = {}

  const addPanel = (
    id: string,
    scope: 'common' | 'adult',
  ): RuntimeAssetEntry => {
    const base = sourceBasename(id)
    const sourceDir = scope === 'adult'
      ? 'panels/intimacy'
      : commonSourceDir(id)
    const targetDir = scope === 'adult'
      ? 'content/assets/adult'
      : 'content/assets/common/panels'
    const urlDir = scope === 'adult'
      ? '/assets/adult'
      : '/assets/common/panels'

    for (const variant of ['preview', 'full'] as const) {
      const suffix = variant === 'preview' ? 'preview' : 'master'
      const fileName = `${id}_${suffix}.webp`
      copies.push({
        id,
        scope,
        variant,
        sourcePath: posix(
          'art/deliverables',
          sourceDir,
          `${base}_${suffix}.webp`,
        ),
        targetPath: posix(targetDir, fileName),
      })
    }

    return {
      preview: `${urlDir}/${id}_preview.webp`,
      full: `${urlDir}/${id}_master.webp`,
    }
  }

  for (const id of commonPanelIds) {
    common[id] = addPanel(id, 'common')
  }
  for (const id of ADULT_IDS) {
    adult[id] = addPanel(id, 'adult')
  }

  for (const id of BACKGROUND_IDS) {
    const fileName = `${id}_master.webp`
    copies.push({
      id,
      scope: 'background',
      variant: 'background',
      sourcePath: posix(
        'art/deliverables/backgrounds',
        `${id}_master.webp`,
      ),
      targetPath: posix(
        'content/assets/common/backgrounds',
        fileName,
      ),
    })
    backgrounds[id] = `/assets/common/backgrounds/${fileName}`
  }

  return { common, adult, backgrounds, copies }
}
