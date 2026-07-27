import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  buildRequiredCommonPanelIds,
  requiredAdultPanelIds,
  validateAdultManifest,
  validatePlayableManifest,
} from '@/domain/asset-manifest'
import {
  assetUrl,
  parseAdultManifest,
  parseCommonManifest,
  withBase,
  type AssetCatalog,
} from '@/domain/runtime-assets'
import { parseRoom } from '@/domain/content-schema'

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
const commonIds = buildRequiredCommonPanelIds(choicePanelIds)

function makePlayableManifest() {
  return {
    schemaVersion: 2,
    mode: 'playable',
    backgrounds: {
      bg_room_a: '/assets/common/backgrounds/bg_room_a_master.webp',
      bg_room_b: '/assets/common/backgrounds/bg_room_b_master.webp',
    },
    assets: Object.fromEntries(
      commonIds.map((id) => [
        id,
        {
          preview: `/assets/common/panels/${id}_preview.webp`,
          full: `/assets/common/panels/${id}_master.webp`,
        },
      ]),
    ),
  }
}

function makeAdultManifest() {
  return {
    schemaVersion: 1,
    assets: Object.fromEntries(
      requiredAdultPanelIds.map((id) => [
        id,
        {
          preview: `/assets/adult/${id}_preview.webp`,
          full: `/assets/adult/${id}_master.webp`,
        },
      ]),
    ),
  }
}

test('playable manifest with 75 common and 2 backgrounds validates', () => {
  const parsed = parseCommonManifest(
    makePlayableManifest(),
    choicePanelIds,
  )
  expect(Object.keys(parsed.assets)).toHaveLength(75)
  expect(Object.keys(parsed.backgrounds).sort()).toEqual([
    'bg_room_a',
    'bg_room_b',
  ])
})

test('common manifest with an /adult/ url fails', () => {
  const manifest = makePlayableManifest()
  manifest.assets.a1_fuse!.full = '/assets/adult/a1_fuse_master.webp'
  const { errors } = validatePlayableManifest(manifest, commonIds)
  expect(errors.some((error) => error.includes('/adult/'))).toBe(true)
})

test('adult manifest only accepts the 12 intimacy ids under /adult/', () => {
  expect(validateAdultManifest(makeAdultManifest()).errors).toEqual([])

  const extra = makeAdultManifest()
  extra.assets.a_intimacy_99 = {
    preview: '/assets/adult/a_intimacy_99_preview.webp',
    full: '/assets/adult/a_intimacy_99_master.webp',
  }
  expect(
    validateAdultManifest(extra).errors.some((error) =>
      error.includes('a_intimacy_99')),
  ).toBe(true)

  const misplaced = makeAdultManifest()
  misplaced.assets.a_intimacy_01!.full =
    '/assets/common/panels/a_intimacy_01_master.webp'
  expect(
    validateAdultManifest(misplaced).errors.some((error) =>
      error.includes('/assets/adult/')),
  ).toBe(true)
})

test('assetUrl returns preview url and throws for unknown ids', () => {
  const catalog: AssetCatalog = {
    common: parseCommonManifest(
      makePlayableManifest(),
      choicePanelIds,
    ).assets,
    adult: null,
    backgrounds: {},
  }
  expect(assetUrl(catalog, 'a1_fuse', 'preview')).toBe(
    '/assets/common/panels/a1_fuse_preview.webp',
  )
  expect(assetUrl(catalog, 'a1_fuse', 'full')).toBe(
    '/assets/common/panels/a1_fuse_master.webp',
  )
  expect(() => assetUrl(catalog, 'does_not_exist', 'preview')).toThrow(
    /does_not_exist/,
  )
})

test('non-root Vite base still produces correct urls', () => {
  expect(
    withBase('/assets/common/panels/a1_fuse_preview.webp', '/building-manager/'),
  ).toBe('/building-manager/assets/common/panels/a1_fuse_preview.webp')
  const catalog: AssetCatalog = {
    common: {
      a1_fuse: {
        preview: '/assets/common/panels/a1_fuse_preview.webp',
        full: '/assets/common/panels/a1_fuse_master.webp',
      },
    },
    adult: null,
    backgrounds: {},
  }
  expect(assetUrl(catalog, 'a1_fuse', 'preview', '/building-manager/')).toBe(
    '/building-manager/assets/common/panels/a1_fuse_preview.webp',
  )
})

test('adult manifest parse exposes the 12 intimacy entries', () => {
  const parsed = parseAdultManifest(makeAdultManifest())
  expect(Object.keys(parsed.assets)).toHaveLength(12)
})
