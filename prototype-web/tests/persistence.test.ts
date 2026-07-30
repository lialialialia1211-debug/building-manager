import {
  COMIC_SAVE_KEY,
  createDefaultSave,
  loadComicSave,
  saveComicState,
  type ComicSave,
  type StorageAdapter,
} from '@/domain/persistence'

function createStorage(initial: Record<string, string> = {}): {
  storage: StorageAdapter
  reads: string[]
  writes: Array<[string, string]>
} {
  const values = new Map(Object.entries(initial))
  const reads: string[] = []
  const writes: Array<[string, string]> = []
  return {
    storage: {
      getItem(key) {
        reads.push(key)
        return values.get(key) ?? null
      },
      setItem(key, value) {
        writes.push([key, value])
        values.set(key, value)
      },
    },
    reads,
    writes,
  }
}

const savedState: ComicSave = {
  schemaVersion: 2,
  ageConfirmed: true,
  slots: ['a', 'b', 'c', 'd'],
  unlockedRouteIds: ['perfect-locked-door'],
}

describe('comic persistence', () => {
  it('loads confirmed age, slots, and route unlocks', () => {
    const { storage } = createStorage({
      [COMIC_SAVE_KEY]: JSON.stringify(savedState),
    })

    expect(loadComicSave(storage)).toEqual(savedState)
  })

  it('migrates an eight-slot save while preserving age and unlocks', () => {
    const { storage } = createStorage({
      [COMIC_SAVE_KEY]: JSON.stringify({
        schemaVersion: 1,
        ageConfirmed: true,
        slots: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        unlockedRouteIds: ['side-male-rover-changli'],
      }),
    })

    expect(loadComicSave(storage)).toEqual({
      schemaVersion: 2,
      ageConfirmed: true,
      slots: [null, null, null, null],
      unlockedRouteIds: ['side-male-rover-changli'],
    })
  })

  it.each([
    '{bad json',
    JSON.stringify({ schemaVersion: 0 }),
    JSON.stringify({ ...savedState, slots: ['too-short'] }),
  ])('falls back safely for corrupt or obsolete save data', (value) => {
    const { storage } = createStorage({ [COMIC_SAVE_KEY]: value })

    expect(loadComicSave(storage)).toEqual(createDefaultSave())
  })

  it('uses only the rewrite namespace and never reads legacy progress', () => {
    const { storage, reads, writes } = createStorage({
      'building-manager-progress-v1': JSON.stringify({ adultMode: true }),
    })

    loadComicSave(storage)
    expect(saveComicState(savedState, storage)).toBe(true)

    expect(reads).toEqual(['office-comic-builder:v1'])
    expect(writes).toHaveLength(1)
    expect(writes[0]?.[0]).toBe('office-comic-builder:v1')
  })

  it('keeps the session usable when storage rejects writes', () => {
    const storage: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      },
    }

    expect(saveComicState(savedState, storage)).toBe(false)
  })
})
