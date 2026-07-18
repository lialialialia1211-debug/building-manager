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

test('accepts the generated playable common manifest', () => {
  const manifest = JSON.parse(readFileSync(
    resolve(process.cwd(), '../content/asset-manifest.json'),
    'utf8',
  ))

  expect(validateAssetManifest(manifest, choicePanelIds)).toEqual({
    mode: 'playable',
    errors: [],
  })
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
