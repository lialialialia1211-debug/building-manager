import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import {
  createComicStore,
  type ComicStoreDependencies,
} from '@/app/store'
import type { StorageAdapter } from '@/domain/persistence'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-episode.json'),
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
    const store = createTestStore()
    await store.getState().initialize()

    store.getState().confirmAge()
    store.getState().placeCard('card_char_male_rover', 0)
    store.getState().placeCard('card_char_changli', 1)
    store.getState().moveCard(0, 3)
    store.getState().removeCard(1)

    expect(store.getState().screen).toBe('builder')
    expect(store.getState().slots[3]).toBe('card_char_male_rover')
    expect(store.getState().slots[1]).toBeNull()
  })

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

  it('reveals a valid ending in sequence and persists its unlock', async () => {
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

    for (let step = 1; step <= 4; step += 1) {
      store.getState().advanceReveal()
      expect(store.getState().revealStep).toBe(step)
    }
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
})
