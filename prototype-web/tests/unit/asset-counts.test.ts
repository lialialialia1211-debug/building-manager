import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { expect, test } from 'vitest'
import {
  buildRequiredPanelIds,
  requiredArtCounts,
  requiredLayeredPanelIds,
  requiredPanelGroups,
  validateAssetManifest,
} from '@/domain/asset-manifest'
import {
  parseGallery,
  parseRoom,
} from '@/domain/content-schema'

const characterIds = [
  'lin_yuwei',
  'chen_haoran',
  'xu_anning',
  'zhou_yan',
]
const expressionIds = [
  'neutral',
  'alert',
  'puzzled',
  'afraid',
  'relaxed',
  'gentle',
  'intimate',
  'tired',
]
const characterReferenceIds = characterIds.flatMap((characterId) => [
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
])
const environmentAndPropIds = [
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
]
const uiIds = [
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
]

const rooms = [
  'room_a_blackout',
  'room_b_wall',
].map((roomId) => parseRoom(JSON.parse(readFileSync(
  resolve(process.cwd(), `../content/rooms/${roomId}.json`),
  'utf8',
))))
const gallery = parseGallery(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/gallery.json'),
  'utf8',
)))
const choicePanelIds = rooms.flatMap((room) => [
  ...new Set(
    Object.values(room.nodes).flatMap((node) => node.candidates),
  ),
])

function makeUnits(ids: readonly string[], group: string) {
  return ids.map((id) => ({
    id,
    path: `art/deliverables/${group}/${id}.webp`,
  }))
}

function makeFormalManifest() {
  return {
    schemaVersion: 1,
    mode: 'formal',
    characterReferenceUnits: makeUnits(
      characterReferenceIds,
      'characters',
    ),
    environmentAndPropUnits: makeUnits(
      environmentAndPropIds,
      'environment_props',
    ),
    uiUnits: makeUnits(uiIds, 'ui'),
    assets: Object.fromEntries(
      buildRequiredPanelIds(choicePanelIds).map((panelId) => [
        panelId,
        {
          path: `art/deliverables/panels/${panelId}_master.webp`,
        },
      ]),
    ),
    layeredPanels: requiredLayeredPanelIds.map((panelId) => ({
      id: panelId,
      path: `art/deliverables/layered/${panelId}.psd`,
    })),
  }
}

function validate(
  manifest: unknown,
  options: {
    rooms?: typeof rooms
    gallery?: typeof gallery
    pathExists?: (path: string) => boolean
  } = {},
) {
  return validateAssetManifest(
    manifest,
    choicePanelIds,
    {
      rooms: options.rooms ?? rooms,
      gallery: options.gallery ?? gallery,
      pathExists: options.pathExists ?? (() => true),
    },
  )
}

test('formal art package uses approved counts', () => {
  expect(requiredArtCounts).toEqual({
    characterReferenceUnits: 64,
    environmentAndPropUnits: 30,
    uiUnits: 16,
    panelMasters: 87,
    layeredPanelPackages: 20,
  })
  expect(characterReferenceIds).toHaveLength(64)
  expect(environmentAndPropIds).toHaveLength(30)
  expect(uiIds).toHaveLength(16)
})

test('formal panel groups add up to the approved master count', () => {
  expect(requiredPanelGroups).toEqual({
    openings: 6,
    choices: 48,
    endings: 6,
    adultSequences: 12,
    safeSequences: 12,
    sixthRoom: 3,
  })
  expect(
    Object.values(requiredPanelGroups).reduce(
      (total, count) => total + count,
      0,
    ),
  ).toBe(requiredArtCounts.panelMasters)
})

test('production adult and safe gallery sequences map to distinct formal panel ids', () => {
  const requiredPanelIds = new Set(
    buildRequiredPanelIds(choicePanelIds),
  )
  const adultEntries = gallery.filter((entry) => entry.adult)

  expect(adultEntries).toHaveLength(2)
  for (const entry of adultEntries) {
    expect(entry.adultSequence).toHaveLength(6)
    expect(entry.safeSequence).toHaveLength(6)
    expect(entry.adultSequence).not.toEqual(entry.safeSequence)
    expect(entry.adultSequence?.every(
      (assetId) =>
        requiredPanelIds.has(assetId)
        && assetId.includes('_intimacy_'),
    )).toBe(true)
    expect(entry.safeSequence?.every(
      (assetId) =>
        requiredPanelIds.has(assetId)
        && assetId.includes('_safe_'),
    )).toBe(true)
  }
})

test('greybox manifest passes with empty formal arrays and no files', () => {
  expect(validateAssetManifest({
    schemaVersion: 1,
    mode: 'greybox',
    characterReferenceUnits: [],
    environmentAndPropUnits: [],
    uiUnits: [],
    assets: {},
    layeredPanels: [],
  }, choicePanelIds, {
    pathExists: () => false,
  })).toEqual({
    mode: 'greybox',
    errors: [],
  })
})

test('fully valid formal fixture passes with injected existing paths', () => {
  expect(validate(makeFormalManifest())).toEqual({
    mode: 'formal',
    errors: [],
  })
})

test('formal arrays reject null and wrong-shaped package entries', () => {
  const manifest = makeFormalManifest()
  manifest.characterReferenceUnits[0] = null as never
  manifest.environmentAndPropUnits[0] = {
    id: environmentAndPropIds[0]!,
  } as never
  manifest.uiUnits[0] = {
    path: 'art/deliverables/ui/ui_logo.webp',
  } as never
  manifest.layeredPanels[0] = null as never

  const { errors } = validate(manifest)

  expect(errors).toContain(
    'characterReferenceUnits[0] must be { id, path }',
  )
  expect(errors).toContain(
    'environmentAndPropUnits[0] must be { id, path }',
  )
  expect(errors).toContain('uiUnits[0] must be { id, path }')
  expect(errors).toContain(
    'layeredPanels[0] must be { id, path }',
  )
})

test('formal packages reject duplicate ids and duplicate paths', () => {
  const manifest = makeFormalManifest()
  manifest.characterReferenceUnits[1] = {
    ...manifest.characterReferenceUnits[1]!,
    id: manifest.characterReferenceUnits[0]!.id,
  }
  manifest.environmentAndPropUnits[1] = {
    ...manifest.environmentAndPropUnits[1]!,
    path: manifest.environmentAndPropUnits[0]!.path,
  }
  manifest.assets.a1_fuse = {
    path: manifest.assets.a1_door!.path,
  }

  const { errors } = validate(manifest)

  expect(errors).toContain(
    `duplicate characterReferenceUnits id ${
      manifest.characterReferenceUnits[0]!.id
    }`,
  )
  expect(errors).toContain(
    `duplicate formal path ${
      manifest.environmentAndPropUnits[0]!.path
    }`,
  )
  expect(errors).toContain(
    `duplicate formal path ${manifest.assets.a1_door!.path}`,
  )
})

test('formal validation rejects invalid filenames across package types', () => {
  const manifest = makeFormalManifest()
  manifest.characterReferenceUnits[0]!.path =
    'art/deliverables/characters/lin final.webp'
  manifest.layeredPanels[0]!.path =
    'art/deliverables/layered/a_open_01_final.psd'

  const { errors } = validate(manifest)

  expect(errors).toContain(
    'invalid formal filename art/deliverables/characters/lin final.webp',
  )
  expect(errors).toContain(
    'invalid formal filename art/deliverables/layered/a_open_01_final.psd',
  )
})

test('formal validation rejects nonexistent declared files', () => {
  const manifest = makeFormalManifest()
  const missingPath = manifest.assets.a1_door!.path

  const { errors } = validate(manifest, {
    pathExists: (path) => path !== missingPath,
  })

  expect(errors).toContain(`missing formal file ${missingPath}`)
})

test('formal validation requires exact ids for every package', () => {
  const manifest = makeFormalManifest()
  const missingCharacter = manifest.characterReferenceUnits.shift()!
  manifest.characterReferenceUnits.push({
    id: 'unapproved_character',
    path: 'art/deliverables/characters/unapproved_character.webp',
  })
  const missingLayered = manifest.layeredPanels.shift()!
  ;(manifest.layeredPanels as Array<{
    id: string
    path: string
  }>).push({
    id: 'unapproved_layered',
    path: 'art/deliverables/layered/unapproved_layered.psd',
  })

  const { errors } = validate(manifest)

  expect(errors).toContain(
    `missing characterReferenceUnits id ${missingCharacter.id}`,
  )
  expect(errors).toContain(
    'unexpected characterReferenceUnits id unapproved_character',
  )
  expect(errors).toContain(
    `missing layeredPanels id ${missingLayered.id}`,
  )
  expect(errors).toContain(
    'unexpected layeredPanels id unapproved_layered',
  )
})

test('panel masters reject missing, extra, and duplicate paths', () => {
  const manifest = makeFormalManifest()
  delete manifest.assets.a1_note
  manifest.assets.unapproved_panel = {
    path: 'art/deliverables/panels/unapproved_panel_master.webp',
  }
  manifest.assets.a1_fuse = {
    path: manifest.assets.a1_door!.path,
  }

  const { errors } = validate(manifest)

  expect(errors).toContain('missing panel asset a1_note')
  expect(errors).toContain('unexpected panel asset unapproved_panel')
  expect(errors).toContain(
    `duplicate formal path ${manifest.assets.a1_door!.path}`,
  )
})

test('formal validation rejects a mismatched room ending asset', () => {
  const invalidRooms = structuredClone(rooms)
  invalidRooms[0]!.endingContent.main.asset = 'room_a_main'

  const { errors } = validate(makeFormalManifest(), {
    rooms: invalidRooms,
  })

  expect(errors).toContain(
    'room room_a_blackout ending main references missing panel asset room_a_main',
  )
})

test('formal validation rejects an invalid gallery sequence reference', () => {
  const invalidGallery = structuredClone(gallery)
  invalidGallery.find(
    (entry) => entry.id === 'room_a_intimacy',
  )!.safeSequence![0] = 'missing_safe_asset'

  const { errors } = validate(makeFormalManifest(), {
    gallery: invalidGallery,
  })

  expect(errors).toContain(
    'gallery room_a_intimacy references missing panel asset missing_safe_asset',
  )
})

test('asset CLI validates the generated playable runtime catalogs', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/validate-assets.ts'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        ART_MODE: 'formal',
      },
    },
  )

  expect(result.status).toBe(0)
  expect(result.stdout).toContain(
    'asset-manifest: playable runtime catalogs valid, 75 common assets, 12 adult assets, 2 backgrounds',
  )
})

test('asset CLI rejects a mutated playable content reference', () => {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'asset-content-'))
  const sourceRoot = resolve(process.cwd(), '../content')
  try {
    mkdirSync(resolve(fixtureRoot, 'rooms'), { recursive: true })
    for (const file of [
      'asset-manifest.json',
      'adult-asset-manifest.json',
      'gallery.json',
    ]) {
      cpSync(resolve(sourceRoot, file), resolve(fixtureRoot, file))
    }
    for (const file of [
      'room_a_blackout.json',
      'room_b_wall.json',
    ]) {
      cpSync(
        resolve(sourceRoot, 'rooms', file),
        resolve(fixtureRoot, 'rooms', file),
      )
    }

    const roomPath = resolve(fixtureRoot, 'rooms/room_a_blackout.json')
    const room = JSON.parse(readFileSync(roomPath, 'utf8'))
    room.openingAssets[0] = 'a_intimacy_01'
    writeFileSync(roomPath, `${JSON.stringify(room, null, 2)}\n`)

    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/validate-assets.ts'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          BUILDING_MANAGER_CONTENT_ROOT: fixtureRoot,
        },
      },
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'room room_a_blackout openingAssets references non-common asset a_intimacy_01',
    )
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})
