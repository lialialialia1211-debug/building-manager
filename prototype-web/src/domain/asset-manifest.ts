import type {
  GalleryEntry,
  RoomDefinition,
} from './types'

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

const characterIds = [
  'lin_yuwei',
  'chen_haoran',
  'xu_anning',
  'zhou_yan',
] as const
const expressionIds = [
  'neutral',
  'alert',
  'puzzled',
  'afraid',
  'relaxed',
  'gentle',
  'intimate',
  'tired',
] as const

export const requiredCharacterReferenceIds = characterIds.flatMap(
  (characterId) => [
    `${characterId}_sheet`,
    `${characterId}_materials`,
    ...expressionIds.map(
      (expressionId) =>
        `${characterId}_expression_${expressionId}`,
    ),
    ...Array.from(
      { length: 6 },
      (_, index) =>
        `${characterId}_pose_${String(index + 1).padStart(2, '0')}`,
    ),
  ],
)

export const requiredEnvironmentAndPropIds = [
  'building_exterior_night',
  'management_room',
  'room_a_living_normal',
  'room_a_living_blackout',
  'room_a_electrical_corridor',
  'room_b_apartment',
  'shared_hallway',
  'hidden_wall_space',
  'light_flashlight',
  'light_candle',
  'light_emergency_red',
  'light_electric_flicker',
  'light_moon_window',
  'light_sixth_room',
  'prop_electrical_box',
  'prop_flashlight',
  'prop_mysterious_note',
  'prop_phone',
  'prop_camera',
  'prop_toolbox',
  'prop_candle',
  'prop_door_chain_key',
  'prop_glass',
  'prop_recorder',
  'prop_blueprint',
  'prop_wall_meter',
  'prop_headphones',
  'prop_marking_tools',
  'prop_wall_tools',
  'prop_symbol_fragment',
] as const

export const requiredUiIds = [
  'ui_logo',
  'ui_building_map',
  'ui_room_a_badge',
  'ui_room_b_badge',
  'ui_locked_room_01',
  'ui_locked_room_02',
  'ui_locked_room_03',
  'ui_locked_room_04',
  'ui_stat_affection',
  'ui_stat_trust',
  'ui_stat_intimacy',
  'ui_ending_main',
  'ui_ending_normal',
  'ui_ending_intimacy',
  'ui_clue',
  'ui_locked_unknown',
] as const

const requiredOpeningPanelIds = [
  'a_open_01',
  'a_open_02',
  'a_open_03',
  'b_open_01',
  'b_open_02',
  'b_open_03',
] as const

const requiredEndingPanelIds = [
  'a_ending_normal',
  'a_ending_main',
  'a_ending_intimacy',
  'b_ending_normal',
  'b_ending_main',
  'b_ending_intimacy',
] as const

const requiredAdultPanelIds = ['a', 'b'].flatMap((room) =>
  Array.from(
    { length: 6 },
    (_, index) => `${room}_intimacy_0${index + 1}`,
  ))

const requiredSafePanelIds = ['a', 'b'].flatMap((room) =>
  Array.from(
    { length: 6 },
    (_, index) => `${room}_safe_0${index + 1}`,
  ))

const requiredSixthRoomPanelIds = [
  'sixth_01',
  'sixth_02',
  'sixth_03',
] as const

export const requiredLayeredPanelIds = [
  'a_open_01',
  'a_open_03',
  'a1_fuse',
  'a2d_listen',
  'a2f_tools',
  'a3_trace',
  'a4_ground',
  'a6_report',
  'a6_consent',
  'a_ending_main',
  'b_open_01',
  'b_open_03',
  'b1_glass',
  'b2g_record',
  'b2k_pattern',
  'b3_blueprint',
  'b4_measure',
  'b6_open',
  'b6_consent',
  'b_ending_main',
] as const

export type AssetManifestMode = 'greybox' | 'formal'

export interface AssetPackageEntry {
  id: string
  path: string
}

export interface AssetManifestAsset {
  path: string
}

export interface AssetManifest {
  schemaVersion: 1
  mode: AssetManifestMode
  characterReferenceUnits: AssetPackageEntry[]
  environmentAndPropUnits: AssetPackageEntry[]
  uiUnits: AssetPackageEntry[]
  assets: Record<string, AssetManifestAsset>
  layeredPanels: AssetPackageEntry[]
}

export interface AssetManifestValidation {
  mode: AssetManifestMode | 'invalid'
  errors: string[]
}

export interface AssetValidationOptions {
  rooms?: readonly RoomDefinition[]
  gallery?: readonly GalleryEntry[]
  pathExists?(path: string): boolean
}

interface ParsedUnitArray {
  entries: AssetPackageEntry[]
  length: number
}

export function buildRequiredPanelIds(
  choicePanelIds: readonly string[],
): string[] {
  return [
    ...choicePanelIds,
    ...requiredOpeningPanelIds,
    ...requiredEndingPanelIds,
    ...requiredAdultPanelIds,
    ...requiredSafePanelIds,
    ...requiredSixthRoomPanelIds,
  ]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
}

function formalFilenameIsValid(path: string): boolean {
  if (
    path.includes('\\')
    || path.includes('..')
    || path.startsWith('/')
    || /\s/.test(path)
    || !/^(?:[a-z0-9]+(?:[_-][a-z0-9]+)*\/)*[a-z0-9]+(?:[_-][a-z0-9]+)*\.[a-z0-9]+$/.test(path)
  ) {
    return false
  }

  return !path
    .toLowerCase()
    .split(/[./_-]+/)
    .some((part) => (
      part === 'final'
      || part === 'final2'
      || part === 'new'
    ))
}

function readUnitArray(
  manifest: Record<string, unknown>,
  key: string,
  errors: string[],
): ParsedUnitArray {
  const value = manifest[key]
  if (!Array.isArray(value)) {
    errors.push(`${key} must be an array`)
    return { entries: [], length: 0 }
  }

  const entries: AssetPackageEntry[] = []
  value.forEach((entry, index) => {
    if (
      !isRecord(entry)
      || !hasExactKeys(entry, ['id', 'path'])
      || typeof entry.id !== 'string'
      || entry.id.trim().length === 0
      || typeof entry.path !== 'string'
      || entry.path.trim().length === 0
    ) {
      errors.push(`${key}[${index}] must be { id, path }`)
      return
    }
    entries.push({
      id: entry.id,
      path: entry.path,
    })
  })

  return { entries, length: value.length }
}

function readPanelAssets(
  value: unknown,
  errors: string[],
): {
  entries: Record<string, AssetManifestAsset>
  ids: string[]
} {
  if (!isRecord(value)) {
    errors.push('assets must be an object')
    return { entries: {}, ids: [] }
  }

  const entries: Record<string, AssetManifestAsset> = {}
  const ids = Object.keys(value)
  for (const [panelId, entry] of Object.entries(value)) {
    if (
      !isRecord(entry)
      || !hasExactKeys(entry, ['path'])
      || typeof entry.path !== 'string'
      || entry.path.trim().length === 0
    ) {
      errors.push(`panel asset ${panelId} must be { path }`)
      continue
    }
    entries[panelId] = { path: entry.path }
  }
  return { entries, ids }
}

function validateCount(
  errors: string[],
  label: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    errors.push(`${label} must be ${expected} (got ${actual})`)
  }
}

function validateExactIds(
  errors: string[],
  label: string,
  entries: readonly AssetPackageEntry[],
  requiredIds: readonly string[],
): void {
  const actualIds = entries.map((entry) => entry.id)
  const actualIdSet = new Set(actualIds)
  for (const id of actualIdSet) {
    if (actualIds.filter((candidate) => candidate === id).length > 1) {
      errors.push(`duplicate ${label} id ${id}`)
    }
  }

  const requiredIdSet = new Set(requiredIds)
  for (const id of requiredIds) {
    if (!actualIdSet.has(id)) {
      errors.push(`missing ${label} id ${id}`)
    }
  }
  for (const id of actualIdSet) {
    if (!requiredIdSet.has(id)) {
      errors.push(`unexpected ${label} id ${id}`)
    }
  }
}

function validatePaths(
  errors: string[],
  paths: readonly string[],
  pathExists: ((path: string) => boolean) | undefined,
): void {
  const seen = new Set<string>()
  const duplicateErrors = new Set<string>()
  for (const path of paths) {
    if (seen.has(path) && !duplicateErrors.has(path)) {
      errors.push(`duplicate formal path ${path}`)
      duplicateErrors.add(path)
    }
    seen.add(path)

    if (!formalFilenameIsValid(path)) {
      errors.push(`invalid formal filename ${path}`)
    }
    if (pathExists && !pathExists(path)) {
      errors.push(`missing formal file ${path}`)
    }
  }
}

function validateContentReferences(
  errors: string[],
  assetIds: ReadonlySet<string>,
  options: AssetValidationOptions,
): void {
  for (const room of options.rooms ?? []) {
    for (const [panelId, panel] of Object.entries(room.panels)) {
      for (const reference of [
        panel.previewAsset,
        panel.fullAsset,
        panel.safeAsset,
      ]) {
        if (reference && !assetIds.has(reference)) {
          errors.push(
            `room ${room.id} panel ${panelId} references missing panel asset ${reference}`,
          )
        }
      }
    }
    for (const [endingId, ending] of Object.entries(
      room.endingContent,
    )) {
      if (!assetIds.has(ending.asset)) {
        errors.push(
          `room ${room.id} ending ${endingId} references missing panel asset ${ending.asset}`,
        )
      }
    }
  }

  for (const entry of options.gallery ?? []) {
    for (const reference of [
      ...(entry.adultSequence ?? []),
      ...(entry.safeSequence ?? []),
    ]) {
      if (!assetIds.has(reference)) {
        errors.push(
          `gallery ${entry.id} references missing panel asset ${reference}`,
        )
      }
    }
  }
}

export function validateAssetManifest(
  value: unknown,
  choicePanelIds: readonly string[],
  options: AssetValidationOptions = {},
): AssetManifestValidation {
  const errors: string[] = []
  if (!isRecord(value)) {
    return {
      mode: 'invalid',
      errors: ['asset manifest must be an object'],
    }
  }

  const mode = value.mode === 'greybox' || value.mode === 'formal'
    ? value.mode
    : 'invalid'
  if (value.schemaVersion !== 1) {
    errors.push('asset manifest schemaVersion must be 1')
  }
  if (mode === 'invalid') {
    errors.push('asset manifest mode must be greybox or formal')
  }

  const characterUnits = readUnitArray(
    value,
    'characterReferenceUnits',
    errors,
  )
  const environmentUnits = readUnitArray(
    value,
    'environmentAndPropUnits',
    errors,
  )
  const uiUnits = readUnitArray(value, 'uiUnits', errors)
  const layeredPanels = readUnitArray(
    value,
    'layeredPanels',
    errors,
  )
  const assets = readPanelAssets(value.assets, errors)

  if (mode !== 'formal') {
    return { mode, errors }
  }

  const uniqueChoiceIds = [...new Set(choicePanelIds)]
  validateCount(
    errors,
    'choice panel count',
    uniqueChoiceIds.length,
    requiredPanelGroups.choices,
  )
  validateCount(
    errors,
    'character reference count',
    characterUnits.length,
    requiredArtCounts.characterReferenceUnits,
  )
  validateCount(
    errors,
    'environment and prop count',
    environmentUnits.length,
    requiredArtCounts.environmentAndPropUnits,
  )
  validateCount(
    errors,
    'UI count',
    uiUnits.length,
    requiredArtCounts.uiUnits,
  )
  validateCount(
    errors,
    'panel master count',
    assets.ids.length,
    requiredArtCounts.panelMasters,
  )
  validateCount(
    errors,
    'layered package count',
    layeredPanels.length,
    requiredArtCounts.layeredPanelPackages,
  )

  validateExactIds(
    errors,
    'characterReferenceUnits',
    characterUnits.entries,
    requiredCharacterReferenceIds,
  )
  validateExactIds(
    errors,
    'environmentAndPropUnits',
    environmentUnits.entries,
    requiredEnvironmentAndPropIds,
  )
  validateExactIds(
    errors,
    'uiUnits',
    uiUnits.entries,
    requiredUiIds,
  )
  validateExactIds(
    errors,
    'layeredPanels',
    layeredPanels.entries,
    requiredLayeredPanelIds,
  )

  const requiredPanelIds = buildRequiredPanelIds(uniqueChoiceIds)
  const requiredPanelIdSet = new Set(requiredPanelIds)
  const actualPanelIdSet = new Set(assets.ids)
  for (const panelId of requiredPanelIds) {
    if (!actualPanelIdSet.has(panelId)) {
      errors.push(`missing panel asset ${panelId}`)
    }
  }
  for (const panelId of actualPanelIdSet) {
    if (!requiredPanelIdSet.has(panelId)) {
      errors.push(`unexpected panel asset ${panelId}`)
    }
  }

  validatePaths(errors, [
    ...characterUnits.entries.map((entry) => entry.path),
    ...environmentUnits.entries.map((entry) => entry.path),
    ...uiUnits.entries.map((entry) => entry.path),
    ...Object.values(assets.entries).map((entry) => entry.path),
    ...layeredPanels.entries.map((entry) => entry.path),
  ], options.pathExists)

  validateContentReferences(
    errors,
    new Set(Object.keys(assets.entries)),
    options,
  )

  return { mode, errors }
}
