import { buildEndingRecap } from '@/domain/ending-recap'
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

test.each(['main', 'normal'] as const)(
  'uses the saved six-panel %s recap followed by its poster',
  (endingId) => {
    expect(buildEndingRecap({
      room,
      endingId,
      savedRecap: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
      adultContent: false,
      adultCatalogReady: false,
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
  }).assetIds).toEqual([
    'a_open_01',
    'a_open_02',
    'a_open_03',
    'a_ending_normal',
  ])
})
