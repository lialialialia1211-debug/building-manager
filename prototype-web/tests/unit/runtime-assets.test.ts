import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  validateAdultAssetManifest,
  validateAssetManifest,
} from '@/domain/asset-manifest'
import {
  parseAdultRuntimeManifest,
  parseCommonRuntimeManifest,
} from '@/domain/runtime-assets'
import {
  parseGallery,
  parseRoom,
} from '@/domain/content-schema'

const rooms = [
  'room_a_blackout',
  'room_b_wall',
].map((roomId) => parseRoom(JSON.parse(readFileSync(
  resolve(process.cwd(), `../content/rooms/${roomId}.json`),
  'utf8',
))))
const choicePanelIds = rooms.flatMap((room) => [
  ...new Set(
    Object.values(room.nodes).flatMap((node) => node.candidates),
  ),
])
const gallery = parseGallery(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/gallery.json'),
  'utf8',
)))

test('accepts the generated playable common manifest', () => {
  const manifest = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/asset-manifest.json'),
    'utf8',
  ))

  const adultManifest = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/adult-asset-manifest.json'),
    'utf8',
  ))
  expect(validateAssetManifest(manifest, choicePanelIds, {
    rooms,
    gallery,
    adultAssetIds: Object.keys(adultManifest.assets),
  })).toEqual({
    mode: 'playable',
    errors: [],
  })
})

test.each([
  [
    'room background typo',
    (changedRooms: typeof rooms, _changedGallery: typeof gallery) => {
      changedRooms[0]!.backgroundAsset = 'missing_background'
    },
    'room room_a_blackout backgroundAsset references missing background missing_background',
  ],
  [
    'opening cross-scope reference',
    (changedRooms: typeof rooms, _changedGallery: typeof gallery) => {
      changedRooms[0]!.openingAssets[0] = 'a_intimacy_01'
    },
    'room room_a_blackout openingAssets references non-common asset a_intimacy_01',
  ],
  [
    'panel preview typo',
    (changedRooms: typeof rooms, _changedGallery: typeof gallery) => {
      changedRooms[0]!.panels.a1_door!.previewAsset = 'missing_preview'
    },
    'room room_a_blackout panel a1_door previewAsset references missing common asset missing_preview',
  ],
  [
    'panel full cross-scope reference',
    (changedRooms: typeof rooms, _changedGallery: typeof gallery) => {
      changedRooms[0]!.panels.a1_door!.fullAsset = 'a_intimacy_01'
    },
    'room room_a_blackout panel a1_door fullAsset references non-common asset a_intimacy_01',
  ],
  [
    'panel safe typo',
    (changedRooms: typeof rooms, _changedGallery: typeof gallery) => {
      changedRooms[0]!.panels.a1_door!.safeAsset = 'missing_safe'
    },
    'room room_a_blackout panel a1_door safeAsset references missing common asset missing_safe',
  ],
  [
    'ending typo',
    (changedRooms: typeof rooms, _changedGallery: typeof gallery) => {
      changedRooms[0]!.endingContent.main.asset = 'missing_ending'
    },
    'room room_a_blackout ending main asset references missing common asset missing_ending',
  ],
  [
    'gallery safe cross-scope reference',
    (_changedRooms: typeof rooms, changedGallery: typeof gallery) => {
      changedGallery.find((entry) => entry.id === 'room_a_intimacy')!
        .safeSequence![0] = 'a_intimacy_01'
    },
    'gallery room_a_intimacy safeSequence references non-common asset a_intimacy_01',
  ],
  [
    'gallery adult common-scope reference',
    (_changedRooms: typeof rooms, changedGallery: typeof gallery) => {
      changedGallery.find((entry) => entry.id === 'room_a_intimacy')!
        .adultSequence![0] = 'a_safe_01'
    },
    'gallery room_a_intimacy adultSequence references non-adult asset a_safe_01',
  ],
  [
    'gallery adult typo',
    (_changedRooms: typeof rooms, changedGallery: typeof gallery) => {
      changedGallery.find((entry) => entry.id === 'room_a_intimacy')!
        .adultSequence![0] = 'missing_adult'
    },
    'gallery room_a_intimacy adultSequence references missing adult asset missing_adult',
  ],
])('playable validation rejects %s', (_name, mutate, expectedError) => {
  const manifest = commonManifestFixture()
  const adultManifest = adultManifestFixture()
  const changedRooms = structuredClone(rooms)
  const changedGallery = structuredClone(gallery)
  mutate(changedRooms, changedGallery)

  expect(validateAssetManifest(manifest, choicePanelIds, {
    rooms: changedRooms,
    gallery: changedGallery,
    adultAssetIds: Object.keys(adultManifest.assets),
  }).errors).toContain(expectedError)
})

test('keeps runtime catalogs isolated and resolves URLs below Vite base', async () => {
  const runtimeAssets = await import('@/domain/runtime-assets').catch(
    () => null,
  )
  const commonManifest = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/asset-manifest.json'),
    'utf8',
  ))
  const adultManifest = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/adult-asset-manifest.json'),
    'utf8',
  ))

  expect(runtimeAssets).not.toBeNull()
  expect(validateAdultAssetManifest(adultManifest)).toEqual([])

  const catalog = runtimeAssets!.createAssetCatalog(
    commonManifest,
    adultManifest,
  )
  expect(Object.keys(catalog.common)).toHaveLength(75)
  expect(Object.keys(catalog.adult ?? {})).toHaveLength(12)
  expect(catalog.backgrounds).toEqual({
    building_a: '/assets/common/backgrounds/building_a_master.webp',
    building_b: '/assets/common/backgrounds/building_b_master.webp',
  })
  expect(runtimeAssets!.assetUrl(
    catalog,
    'a1_fuse',
    'preview',
    '/building-manager/',
  )).toBe('/building-manager/assets/common/panels/a1_fuse_preview.webp')
  expect(runtimeAssets!.assetUrl(catalog, 'missing', 'full')).toBe('')
})

test('rejects adult URLs in the playable common manifest', () => {
  const manifest = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/asset-manifest.json'),
    'utf8',
  ))
  manifest.assets.a1_fuse.preview =
    '/assets/adult/a_intimacy_01_preview.webp'

  expect(validateAssetManifest(manifest, choicePanelIds).errors)
    .toContain('common asset a1_fuse preview must use /assets/common/')
})

const commonManifestPath = resolve(
  process.cwd(),
  '../content/asset-manifest.json',
)
const adultManifestPath = resolve(
  process.cwd(),
  '../content/adult-asset-manifest.json',
)

function commonManifestFixture(): Record<string, any> {
  return JSON.parse(readFileSync(commonManifestPath, 'utf8'))
}

function adultManifestFixture(): Record<string, any> {
  return JSON.parse(readFileSync(adultManifestPath, 'utf8'))
}

test.each([
  ['missing asset', (manifest: Record<string, any>) => {
    delete manifest.assets.a1_fuse
  }],
  ['extra asset', (manifest: Record<string, any>) => {
    manifest.assets.unexpected = manifest.assets.a1_fuse
  }],
  ['mis-rooted asset', (manifest: Record<string, any>) => {
    manifest.assets.a1_fuse.preview = '/wrong/a1_fuse.webp'
  }],
  ['missing background', (manifest: Record<string, any>) => {
    delete manifest.backgrounds.building_a
  }],
  ['extra background', (manifest: Record<string, any>) => {
    manifest.backgrounds.unexpected = manifest.backgrounds.building_a
  }],
  ['mis-rooted background', (manifest: Record<string, any>) => {
    manifest.backgrounds.building_a = '/wrong/building_a.webp'
  }],
])('runtime parser rejects a common manifest with %s', (_name, mutate) => {
  const manifest = commonManifestFixture()
  mutate(manifest)

  expect(() => parseCommonRuntimeManifest(manifest)).toThrow()
})

test.each([
  ['missing asset', (manifest: Record<string, any>) => {
    delete manifest.assets.a_intimacy_01
  }],
  ['extra asset', (manifest: Record<string, any>) => {
    manifest.assets.unexpected = manifest.assets.a_intimacy_01
  }],
  ['mis-rooted asset', (manifest: Record<string, any>) => {
    manifest.assets.a_intimacy_01.full = '/assets/common/wrong.webp'
  }],
])('runtime parser rejects an adult manifest with %s', (_name, mutate) => {
  const manifest = adultManifestFixture()
  mutate(manifest)

  expect(() => parseAdultRuntimeManifest(manifest)).toThrow()
})
