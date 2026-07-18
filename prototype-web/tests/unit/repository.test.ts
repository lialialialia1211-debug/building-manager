import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, vi } from 'vitest'
import {
  contentUrl,
  loadCharacters,
  loadGallery,
  loadRoom,
} from '@/domain/repository'

const room = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  backgroundAsset: 'building_a',
  openingAssets: ['a_open_01', 'a_open_02', 'a_open_03'],
  startNode: 'a1',
  safeNode: 'a1',
  endingAnchor: 'ending',
  nodes: {
    a1: { candidates: ['p1', 'p2', 'p3'] },
  },
  panels: {
    p1: {
      next: 'ending',
      previewAsset: 'p1',
      actionLabel: '查看門口',
      dialogue: ['門外傳來敲門聲。'],
    },
    p2: {
      next: 'ending',
      previewAsset: 'p2',
      actionLabel: '檢查桌面',
      dialogue: ['桌面留下新的刮痕。'],
    },
    p3: {
      next: 'ending',
      previewAsset: 'p3',
      actionLabel: '留在原地',
      dialogue: ['房間暫時恢復安靜。'],
    },
  },
  endingRules: [
    { id: 'intimacy', priority: 300, conditions: {} },
    { id: 'main', priority: 200, conditions: {} },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    intimacy: {
      title: '親密結局',
      asset: 'intimacy',
      clueIds: [],
      galleryUnlocks: [],
    },
    main: {
      title: '主線結局',
      asset: 'main',
      clueIds: [],
      galleryUnlocks: [],
    },
    normal: {
      title: '普通結局',
      asset: 'normal',
      clueIds: [],
      galleryUnlocks: [],
    },
  },
}

test('uses the canonical Room B title in content', () => {
  const content = JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        '../content/rooms/room_b_wall.json',
      ),
      'utf8',
    ),
  ) as { title: string }

  expect(content.title).toBe('牆後的聲音')
})

test('resolves content beneath a GitHub Pages project base path', () => {
  expect(
    contentUrl(
      'rooms/room_a_blackout.json',
      '/building-manager/',
    ),
  ).toBe('/building-manager/rooms/room_a_blackout.json')
})

test('loads and parses a room from its exact content path', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => room,
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(loadRoom('room_a_blackout')).resolves.toEqual(room)
  expect(fetchMock).toHaveBeenCalledWith(
    '/rooms/room_a_blackout.json',
  )
})

test('rejects room content whose id differs from the requested id', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ...room,
      id: 'room_b_wall',
    }),
  }))

  await expect(loadRoom('room_a_blackout')).rejects.toThrow(
    'room id mismatch',
  )
})

test('loads and parses adult characters', async () => {
  const characters = [
    {
      id: 'lin_yuwei',
      displayName: '林雨薇',
      age: 28,
      ageStatus: 'adult',
      roomId: 'room_a_blackout',
    },
  ]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => characters,
  }))

  await expect(loadCharacters()).resolves.toEqual(characters)
})

test('rejects character content that is not adult', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      id: 'invalid',
      displayName: 'Invalid',
      age: 17,
      ageStatus: 'adult',
      roomId: 'room_a_blackout',
    }],
  }))

  await expect(loadCharacters()).rejects.toThrow()
})

test('loads gallery only through the strict gallery schema', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      id: 'room_a_intimacy',
      roomId: 'room_a_blackout',
      endingId: 'intimacy',
      adult: true,
      adultSequence: ['a_intimacy_01'],
      safeSequence: [],
    }],
  }))

  await expect(loadGallery()).rejects.toThrow()
})
