import { expect, test } from 'vitest'
import * as progressModule from '@/domain/progress'
import {
  PROGRESS_KEY,
  createEmptyProgress,
  loadProgress,
  saveProgress,
  type StorageAdapter,
} from '@/domain/progress'

const BACKUP_1_KEY = 'building-manager-progress-v1-backup-1'
const BACKUP_2_KEY = 'building-manager-progress-v1-backup-2'
const CORRUPT_KEY = 'building-manager-progress-v1-corrupt-debug'

interface MemoryStorage extends StorageAdapter {
  values: Map<string, string>
}

function createStorage(): MemoryStorage {
  const values = new Map<string, string>()

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

function snapshot(
  overrides: Partial<{
    roomId: string
    currentNode: string
    choiceCount: number
    chosenPanels: string[]
  }> = {},
) {
  return {
    roomId: 'room_a_blackout',
    currentNode: 'a2_fuse',
    choiceCount: 1,
    chosenPanels: ['a1_fuse'],
    stats: { affection: 0, trust: 0, intimacy: 0 },
    flags: {},
    ...overrides,
  }
}

function progressWithCurrentRun(currentRun: unknown) {
  return {
    ...createEmptyProgress(),
    currentRun,
    completedEndings: {
      room_a_blackout: ['main'],
    },
    clues: ['kept-clue'],
    galleryUnlocks: ['kept-gallery'],
    settings: {
      adultContent: false,
      exactStats: true,
      autoFastForward: false,
    },
  }
}

test('adult content defaults to enabled', () => {
  expect(createEmptyProgress().settings.adultContent).toBe(true)
})

test('progress defaults use the approved settings contract', () => {
  expect(createEmptyProgress().settings).toEqual({
    adultContent: true,
    exactStats: false,
    autoFastForward: true,
  })
})

test('exports stable primary, backup, and corrupt-debug keys', () => {
  expect(progressModule).toMatchObject({
    PROGRESS_KEY,
    PROGRESS_BACKUP_1_KEY: BACKUP_1_KEY,
    PROGRESS_BACKUP_2_KEY: BACKUP_2_KEY,
    PROGRESS_CORRUPT_KEY: CORRUPT_KEY,
  })
})

test('locked choice survives reload', () => {
  const storage = createStorage()
  const progress = createEmptyProgress()
  progress.currentRun = {
    roomId: 'room_a_blackout',
    lockedPanelId: 'a1_fuse',
    snapshot: snapshot(),
  }

  saveProgress(storage, progress)

  expect(loadProgress(storage).currentRun?.lockedPanelId).toBe('a1_fuse')
})

test('an unfinished twelve-card draft survives reload before confirmation', () => {
  const storage = createStorage()
  const progress = createEmptyProgress()
  progress.currentRun = {
    roomId: 'room_a_blackout',
    snapshot: {
      mode: 'drafting',
      roomId: 'room_a_blackout',
      dealSeed: 'qa-seed',
      dealtPanels: Array.from(
        { length: 12 },
        (_, index) => `a${index + 1}`,
      ),
      slots: ['a1', 'a2', null, null, null, null],
      confirmed: false,
      revealCount: 0,
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: {},
    },
  }

  saveProgress(storage, progress)

  expect(loadProgress(storage).currentRun?.snapshot).toMatchObject({
    mode: 'drafting',
    slots: ['a1', 'a2', null, null, null, null],
    confirmed: false,
  })
})

test.each([
  [
    'a locked panel without a snapshot',
    {
      roomId: 'room_a_blackout',
      lockedPanelId: 'a1_fuse',
    },
  ],
  [
    'a snapshot from another room',
    {
      roomId: 'room_a_blackout',
      lockedPanelId: 'a1_fuse',
      snapshot: snapshot({ roomId: 'room_b_wall' }),
    },
  ],
  [
    'a locked panel that is not the final chosen panel',
    {
      roomId: 'room_a_blackout',
      lockedPanelId: 'a1_fuse',
      snapshot: snapshot({ chosenPanels: ['a1_door'] }),
    },
  ],
  [
    'a zero-choice locked snapshot',
    {
      roomId: 'room_a_blackout',
      lockedPanelId: 'a1_fuse',
      snapshot: snapshot({
        currentNode: 'a1',
        choiceCount: 0,
        chosenPanels: [],
      }),
    },
  ],
])('clears only currentRun when version 1 contains %s', (_name, currentRun) => {
  const storage = createStorage()
  storage.setItem(
    PROGRESS_KEY,
    JSON.stringify(progressWithCurrentRun(currentRun)),
  )

  const loaded = loadProgress(storage)

  expect(loaded).toMatchObject({
    currentRun: null,
    completedEndings: {
      room_a_blackout: ['main'],
    },
    clues: ['kept-clue'],
    galleryUnlocks: ['kept-gallery'],
    settings: {
      adultContent: false,
      exactStats: true,
      autoFastForward: false,
    },
  })
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  ).currentRun).toBeNull()
})

test('incomplete version-1 progress merges missing fields with defaults', () => {
  const storage = createStorage()
  storage.setItem(PROGRESS_KEY, JSON.stringify({
    version: 1,
    currentRun: null,
    settings: {
      adultContent: false,
    },
  }))

  expect(loadProgress(storage)).toEqual({
    ...createEmptyProgress(),
    settings: {
      adultContent: false,
      exactStats: false,
      autoFastForward: true,
    },
  })
})

test('wrong-shaped version-1 progress is retained and starts fresh', () => {
  const storage = createStorage()
  const raw = JSON.stringify({
    version: 1,
    completedEndings: [],
    settings: {
      adultContent: 'yes',
      exactStats: false,
      autoFastForward: true,
    },
  })
  storage.setItem(PROGRESS_KEY, raw)

  expect(loadProgress(storage)).toEqual(createEmptyProgress())
  expect(storage.getItem(CORRUPT_KEY)).toBe(raw)
})

test('invalid ending enum values do not reach callers', () => {
  const storage = createStorage()
  storage.setItem(PROGRESS_KEY, JSON.stringify({
    ...createEmptyProgress(),
    completedEndings: {
      room_a_blackout: ['future-ending'],
    },
  }))

  expect(loadProgress(storage)).toEqual(createEmptyProgress())
})

test('unknown progress versions are retained and start fresh', () => {
  const storage = createStorage()
  const raw = JSON.stringify({ version: 2 })
  storage.setItem(PROGRESS_KEY, raw)

  expect(loadProgress(storage)).toEqual(createEmptyProgress())
  expect(storage.getItem(CORRUPT_KEY)).toBe(raw)
})

test('invalid saved progress is retained and starts fresh', () => {
  const storage = createStorage()
  storage.setItem(PROGRESS_KEY, '{not json')

  expect(loadProgress(storage)).toEqual(createEmptyProgress())
  expect(storage.getItem(CORRUPT_KEY)).toBe('{not json')
})

test('successful saves retain the two most recent readable prior saves', () => {
  const storage = createStorage()
  const first = createEmptyProgress()
  first.clues = ['first']
  const second = createEmptyProgress()
  second.clues = ['second']
  const third = createEmptyProgress()
  third.clues = ['third']

  saveProgress(storage, first)
  saveProgress(storage, second)
  saveProgress(storage, third)

  expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}').clues)
    .toEqual(['third'])
  expect(JSON.parse(storage.getItem(BACKUP_1_KEY) ?? '{}').clues)
    .toEqual(['second'])
  expect(JSON.parse(storage.getItem(BACKUP_2_KEY) ?? '{}').clues)
    .toEqual(['first'])
})

test('recovers backup 1, retains corrupt primary, and restores primary', () => {
  const storage = createStorage()
  const recovered = createEmptyProgress()
  recovered.clues = ['backup-one']
  const older = createEmptyProgress()
  older.clues = ['backup-two']
  storage.setItem(PROGRESS_KEY, '{broken primary')
  storage.setItem(BACKUP_1_KEY, JSON.stringify(recovered))
  storage.setItem(BACKUP_2_KEY, JSON.stringify(older))

  expect(loadProgress(storage).clues).toEqual(['backup-one'])
  expect(storage.getItem(CORRUPT_KEY)).toBe('{broken primary')
  expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}').clues)
    .toEqual(['backup-one'])
})

test('falls back to backup 2 when backup 1 is unreadable', () => {
  const storage = createStorage()
  const recovered = createEmptyProgress()
  recovered.clues = ['backup-two']
  storage.setItem(PROGRESS_KEY, '{broken primary')
  storage.setItem(BACKUP_1_KEY, '{broken backup')
  storage.setItem(BACKUP_2_KEY, JSON.stringify(recovered))

  expect(loadProgress(storage).clues).toEqual(['backup-two'])
  expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}').clues)
    .toEqual(['backup-two'])
})
