import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import {
  createComicStore,
  type ComicStoreDependencies,
} from '@/app/store'
import {
  COMIC_SAVE_KEY,
  type StorageAdapter,
} from '@/domain/persistence'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-comic/office-episode.json'),
  'utf8',
)) as unknown)

function createMemoryStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

function createTestStore(
  overrides: Partial<ComicStoreDependencies> = {},
) {
  return createComicStore({
    storage: createMemoryStorage(),
    loadEpisode: async () => episode,
    ...overrides,
  })
}

describe('comic app store', () => {
  it('loads content and opens the age gate for a new save', async () => {
    const store = createTestStore()

    await store.getState().initialize()

    expect(store.getState()).toMatchObject({
      screen: 'age-gate',
      episode,
      errorMessage: null,
    })
  })

  it('reports load errors and retries successfully', async () => {
    let attempts = 0
    const store = createTestStore({
      loadEpisode: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('offline')
        return episode
      },
    })

    await store.getState().initialize()
    expect(store.getState()).toMatchObject({
      screen: 'error',
      errorMessage: 'offline',
    })

    await store.getState().initialize()
    expect(store.getState().screen).toBe('age-gate')
  })

  it('confirms age and places, moves, and removes cards', async () => {
    const storage = createMemoryStorage()
    const store = createTestStore({ storage })
    await store.getState().initialize()

    store.getState().confirmAge()
    store.getState().placeCard('card_char_male_rover', 0)
    store.getState().placeCard('card_char_changli', 1)
    store.getState().moveCard(0, 3)
    store.getState().removeCard(1)

    expect(store.getState().screen).toBe('builder')
    expect(store.getState().slots[3]).toBe('card_char_male_rover')
    expect(store.getState().slots[1]).toBeNull()
    expect(JSON.parse(storage.getItem(COMIC_SAVE_KEY) ?? '{}')).toMatchObject({
      schemaVersion: 2,
    })
  })

  it.each([
    [
      'unknown card',
      [
        'card_unknown',
        'card_char_changli',
        'card_scene_boss_office',
        'card_prop_merger_contract',
      ],
    ],
    [
      'duplicate card',
      [
        'card_char_male_rover',
        'card_char_male_rover',
        'card_scene_boss_office',
        'card_prop_merger_contract',
      ],
    ],
  ])(
    'clears a saved arrangement containing an %s without losing progress',
    async (_, slots) => {
      const storage = createMemoryStorage()
      storage.setItem(COMIC_SAVE_KEY, JSON.stringify({
        schemaVersion: 2,
        ageConfirmed: true,
        slots,
        unlockedRouteIds: ['side-male-rover-changli'],
      }))
      const store = createTestStore({ storage })

      await store.getState().initialize()

      expect(store.getState()).toMatchObject({
        screen: 'builder',
        ageConfirmed: true,
        slots: [null, null, null, null],
        unlockedRouteIds: ['side-male-rover-changli'],
      })
      expect(JSON.parse(storage.getItem(COMIC_SAVE_KEY) ?? '{}')).toMatchObject({
        schemaVersion: 2,
        ageConfirmed: true,
        slots: [null, null, null, null],
        unlockedRouteIds: ['side-male-rover-changli'],
      })
    },
  )

  it('keeps the arrangement and explains an invalid submission', async () => {
    const store = createTestStore()
    await store.getState().initialize()
    store.getState().confirmAge()
    for (const [index, card] of episode.cards
      .filter((candidate) => candidate.kind !== 'character')
      .entries()) {
      store.getState().placeCard(card.id, index)
    }
    const beforeSubmit = store.getState().slots

    store.getState().submit()

    expect(store.getState().screen).toBe('builder')
    expect(store.getState().resolution).toEqual({
      kind: 'invalid',
      reason: 'character-count',
      characterCount: 0,
    })
    expect(store.getState().slots).toEqual(beforeSubmit)
  })

  it('reveals a valid ending at once and persists its unlock', async () => {
    const storage = createMemoryStorage()
    const store = createComicStore({
      storage,
      loadEpisode: async () => episode,
    })
    await store.getState().initialize()
    store.getState().confirmAge()
    episode.perfectFingerprint.forEach((cardId, index) => {
      store.getState().placeCard(cardId, index)
    })

    store.getState().submit()
    expect(store.getState()).toMatchObject({
      screen: 'reveal',
      revealStep: 0,
      resolution: {
        kind: 'perfect',
        routeId: 'perfect-locked-door',
      },
    })

    store.getState().revealAll()
    expect(store.getState().revealStep).toBe(4)
    expect(store.getState().screen).toBe('reveal')
    store.getState().advanceReveal()

    expect(store.getState().screen).toBe('ending')
    expect(store.getState().unlockedRouteIds).toEqual([
      'perfect-locked-door',
    ])

    const restored = createComicStore({
      storage,
      loadEpisode: async () => episode,
    })
    await restored.getState().initialize()
    expect(restored.getState().screen).toBe('builder')
    expect(restored.getState().slots).toEqual(episode.perfectFingerprint)
    expect(restored.getState().unlockedRouteIds).toEqual([
      'perfect-locked-door',
    ])
  })

  it('does not reveal all before a valid route is submitted', async () => {
    const store = createTestStore()
    await store.getState().initialize()

    store.getState().revealAll()

    expect(store.getState().revealStep).toBe(0)
    expect(store.getState().screen).toBe('age-gate')
  })
})
