import { buildEndingRecap } from '@/domain/ending-recap'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type { GalleryEntry, RoomDefinition } from '@/domain/types'

const ending = {
  title: 'Fixture ending',
  asset: 'a_ending_main',
  clueIds: [] as string[],
  galleryUnlocks: [] as string[],
}

const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  backgroundAsset: 'building_a',
  openingAssets: ['a_open_01', 'a_open_02', 'a_open_03'],
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: { n1: { candidates: ['a1', 'a2', 'a3'] } },
  panels: {
    a1: { next: 'ending', previewAsset: 'a1', dialogue: [], actionLabel: '1' },
    a2: { next: 'ending', previewAsset: 'a2', dialogue: [], actionLabel: '2' },
    a3: { next: 'ending', previewAsset: 'a3', dialogue: [], actionLabel: '3' },
    a4: { next: 'ending', previewAsset: 'a4', dialogue: [], actionLabel: '4' },
    a5: { next: 'ending', previewAsset: 'a5', dialogue: [], actionLabel: '5' },
    a6: { next: 'ending', previewAsset: 'a6', dialogue: [], actionLabel: '6' },
  },
  endingRules: [],
  endingContent: {
    main: ending,
    normal: { ...ending, asset: 'a_ending_normal' },
    intimacy: { ...ending, asset: 'a_ending_intimacy' },
  },
}

const intimacyEntry: GalleryEntry = {
  id: 'room_a_intimacy',
  roomId: room.id,
  endingId: 'intimacy',
  adult: true,
  adultSequence: Array.from(
    { length: 6 },
    (_, index) => `a_intimacy_0${index + 1}`,
  ),
  safeSequence: Array.from(
    { length: 6 },
    (_, index) => `a_safe_0${index + 1}`,
  ),
}

const customIntimacyEntry: GalleryEntry = {
  ...intimacyEntry,
  adultSequence: Array.from(
    { length: 6 },
    (_, index) => `a_intimacy_aftercare_0${index + 1}`,
  ),
  safeSequence: Array.from(
    { length: 6 },
    (_, index) => `a_safe_aftercare_0${index + 1}`,
  ),
}

const catalog: AssetCatalog = {
  common: Object.fromEntries([
    ...room.openingAssets,
    ...Object.keys(room.panels),
    ...Object.values(room.endingContent).map((value) => value.asset),
    ...intimacyEntry.safeSequence!,
    ...customIntimacyEntry.safeSequence!,
  ].map((id) => [id, { preview: `/common/${id}`, full: `/common/${id}` }])),
  adult: Object.fromEntries([
    ...intimacyEntry.adultSequence!,
    ...customIntimacyEntry.adultSequence!,
  ].map((id) => [id, { preview: `/adult/${id}`, full: `/adult/${id}` }])),
  backgrounds: {},
}

test.each(['main', 'normal'] as const)(
  'uses the saved six-panel %s recap followed by its poster',
  (endingId) => {
    expect(buildEndingRecap({
      room,
      endingId,
      savedRecap: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
      adultContent: false,
      adultCatalogReady: false,
      catalog,
    })).toEqual({
      assetIds: [
        'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
        `a_ending_${endingId}`,
      ],
      usedSafeFallback: false,
    })
  },
)

test('uses the deterministic opening and poster fallback for an old save', () => {
  expect(buildEndingRecap({
    room,
    endingId: 'main',
    adultContent: true,
    adultCatalogReady: true,
    catalog,
  }).assetIds).toEqual([
    'a_open_01',
    'a_open_02',
    'a_open_03',
    'a_ending_main',
  ])
})

test('uses the adult intimacy sequence only when adult assets are ready', () => {
  expect(buildEndingRecap({
    room,
    endingId: 'intimacy',
    galleryEntry: intimacyEntry,
    adultContent: true,
    adultCatalogReady: true,
    catalog,
  })).toEqual({
    assetIds: [
      ...intimacyEntry.adultSequence!,
      'a_ending_intimacy',
    ],
    usedSafeFallback: false,
  })
})

test.each([
  { adultContent: false, adultCatalogReady: false },
  { adultContent: true, adultCatalogReady: false },
])('uses only safe intimacy assets when adult art is unavailable', (availability) => {
  const result = buildEndingRecap({
    room,
    endingId: 'intimacy',
    galleryEntry: intimacyEntry,
    catalog,
    ...availability,
  })

  expect(result).toEqual({
    assetIds: [
      ...intimacyEntry.safeSequence!,
      'a_ending_intimacy',
    ],
    usedSafeFallback: true,
  })
  expect(result.assetIds.join(' ')).not.toContain('a_intimacy_')
  expect(result.assetIds.join(' ')).not.toContain('/adult/')
})

test('filters cross-room recap panels and never returns an empty sequence', () => {
  expect(buildEndingRecap({
    room,
    endingId: 'normal',
    savedRecap: ['b1', 'b2'],
    adultContent: false,
    adultCatalogReady: false,
    catalog,
  }).assetIds).toEqual([
    'a_open_01',
    'a_open_02',
    'a_open_03',
    'a_ending_normal',
  ])
})

test.each([
  ['partial', ['a1', 'a2', 'a3', 'a4', 'a5']],
  ['mixed room', ['a1', 'a2', 'a3', 'a4', 'a5', 'b1']],
  ['duplicate', ['a1', 'a2', 'a3', 'a4', 'a5', 'a5']],
] as const)('falls back to opening assets for a %s saved recap', (_label, savedRecap) => {
  expect(buildEndingRecap({
    room,
    endingId: 'main',
    savedRecap,
    adultContent: false,
    adultCatalogReady: false,
    catalog,
  }).assetIds).toEqual([
    'a_open_01',
    'a_open_02',
    'a_open_03',
    'a_ending_main',
  ])
})

test('accepts authored intimacy IDs instead of synthesizing canonical IDs', () => {
  expect(buildEndingRecap({
    room,
    endingId: 'intimacy',
    galleryEntry: customIntimacyEntry,
    adultContent: true,
    adultCatalogReady: true,
    catalog,
  }).assetIds).toEqual([
    ...customIntimacyEntry.adultSequence!,
    'a_ending_intimacy',
  ])
})

test('rejects adult IDs smuggled into a safe sequence', () => {
  const malicious: GalleryEntry = {
    ...intimacyEntry,
    safeSequence: [...intimacyEntry.adultSequence!],
  }
  const result = buildEndingRecap({
    room,
    endingId: 'intimacy',
    galleryEntry: malicious,
    adultContent: false,
    adultCatalogReady: false,
    catalog,
  })

  expect(result.assetIds).toEqual([
    'a_open_01',
    'a_open_02',
    'a_open_03',
    'a_ending_intimacy',
  ])
  expect(result.assetIds.join(' ')).not.toContain('intimacy_')
})

test('rejects safe IDs in the adult list and falls back to authored safe art', () => {
  const malicious: GalleryEntry = {
    ...intimacyEntry,
    adultSequence: [...intimacyEntry.safeSequence!],
  }

  expect(buildEndingRecap({
    room,
    endingId: 'intimacy',
    galleryEntry: malicious,
    adultContent: true,
    adultCatalogReady: true,
    catalog,
  })).toEqual({
    assetIds: [
      ...intimacyEntry.safeSequence!,
      'a_ending_intimacy',
    ],
    usedSafeFallback: true,
  })
})
