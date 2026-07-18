import { expect, test } from 'vitest'
import {
  createAppStore as createStore,
  type AppStoreDependencies,
  type AppStoreApi,
} from '@/app/store'
import type { PlaytestRecorder } from '@/analytics/playtest-log'
import {
  PROGRESS_KEY,
  createEmptyProgress,
  loadProgress,
  saveProgress,
  type StorageAdapter,
} from '@/domain/progress'
import { wasRead } from '@/domain/read-history'
import {
  StoryEngine,
  type StorySnapshot,
} from '@/domain/story-engine'
import type {
  PanelDefinition,
  RoomDefinition,
} from '@/domain/types'

const noOpRecorder: PlaytestRecorder = {
  record() {},
}

function createAppStore(
  dependencies: AppStoreDependencies = {},
): AppStoreApi {
  return createStore({
    ...dependencies,
    recorder: dependencies.recorder ?? noOpRecorder,
  })
}

const emptyEnding = {
  title: 'Fixture ending',
  asset: 'ending-fixture',
  clueIds: [],
  galleryUnlocks: [],
}

function withFixtureDialogue(
  panels: Record<string, Omit<PanelDefinition, 'dialogue'>>,
): RoomDefinition['panels'] {
  return Object.fromEntries(
    Object.entries(panels).map(([panelId, panel]) => [
      panelId,
      {
        ...panel,
        dialogue: ['Fixture dialogue'],
      },
    ]),
  )
}

const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'fixture',
  title: 'Fixture',
  backgroundAsset: 'building_fixture',
  openingAssets: ['fixture_open_01', 'fixture_open_02', 'fixture_open_03'],
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: {
    n1: { candidates: ['p1', 'p2', 'p3'] },
    n2: { candidates: ['p4', 'p5', 'p6'] },
  },
  panels: withFixtureDialogue({
    p1: {
      next: 'n2',
      previewAsset: 'p1',
      actionLabel: '查看門口',
      effects: { trust: 1 },
      setFlags: ['clue'],
      dialogueVariant: 'cross_room',
    },
    p2: {
      next: 'n2',
      previewAsset: 'p2',
      actionLabel: '檢查桌面',
    },
    p3: {
      next: 'n2',
      previewAsset: 'p3',
      actionLabel: '留在原地',
    },
    p4: {
      next: 'ending',
      previewAsset: 'p4',
      actionLabel: '繼續調查',
    },
    p5: {
      next: 'ending',
      previewAsset: 'p5',
      actionLabel: '交換線索',
    },
    p6: {
      next: 'ending',
      previewAsset: 'p6',
      actionLabel: '等待天亮',
    },
  }),
  endingRules: [
    { id: 'intimacy', priority: 300, conditions: {} },
    { id: 'main', priority: 200, conditions: {} },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    intimacy: emptyEnding,
    main: emptyEnding,
    normal: emptyEnding,
  },
}

test('shows a fresh opening once and skips it when resuming a saved run', async () => {
  const storage = createStorage()
  const firstStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })

  expect(firstStore.getState().openingPending).toBe(false)
  await firstStore.getState().startRoom(room.id)
  expect(firstStore.getState().openingPending).toBe(true)

  firstStore.getState().finishOpening()
  expect(firstStore.getState().openingPending).toBe(false)

  firstStore.getState().choosePanel('p1')
  const resumedStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  expect(resumedStore.getState().openingPending).toBe(false)

  await resumedStore.getState().resumeCurrentRun()

  expect(resumedStore.getState()).toMatchObject({
    screen: 'comic',
    openingPending: false,
  })
})

const settlementRoom: RoomDefinition = {
  ...room,
  id: 'settlement',
  nodes: {
    n1: { candidates: ['p1', 'p2', 'p3'] },
    n2: { candidates: ['p4', 'p5', 'p6'] },
    n3: { candidates: ['p7', 'p8', 'p9'] },
    n4: { candidates: ['p10', 'p11', 'p12'] },
    n5: { candidates: ['p13', 'p14', 'p15'] },
    n6: { candidates: ['p16', 'p17', 'p18'] },
  },
  panels: withFixtureDialogue({
    p1: {
      next: 'n2',
      previewAsset: 'p1',
      actionLabel: '第一步',
      effects: { trust: 1 },
    },
    p2: { next: 'n2', previewAsset: 'p2', actionLabel: '第一步備選' },
    p3: { next: 'n2', previewAsset: 'p3', actionLabel: '第一步備選' },
    p4: {
      next: 'n3',
      previewAsset: 'p4',
      actionLabel: '第二步',
      effects: { trust: 1 },
    },
    p5: { next: 'n3', previewAsset: 'p5', actionLabel: '第二步備選' },
    p6: { next: 'n3', previewAsset: 'p6', actionLabel: '第二步備選' },
    p7: {
      next: 'n4',
      previewAsset: 'p7',
      actionLabel: '第三步',
      effects: { trust: 1 },
    },
    p8: { next: 'n4', previewAsset: 'p8', actionLabel: '第三步備選' },
    p9: { next: 'n4', previewAsset: 'p9', actionLabel: '第三步備選' },
    p10: {
      next: 'n5',
      previewAsset: 'p10',
      actionLabel: '第四步',
      effects: { trust: 1, intimacy: 1 },
    },
    p11: { next: 'n5', previewAsset: 'p11', actionLabel: '第四步備選' },
    p12: { next: 'n5', previewAsset: 'p12', actionLabel: '第四步備選' },
    p13: {
      next: 'n6',
      previewAsset: 'p13',
      actionLabel: '第五步',
      effects: { intimacy: 1 },
    },
    p14: { next: 'n6', previewAsset: 'p14', actionLabel: '第五步備選' },
    p15: { next: 'n6', previewAsset: 'p15', actionLabel: '第五步備選' },
    p16: {
      next: 'ending',
      previewAsset: 'p16',
      actionLabel: '第六步',
      effects: { intimacy: 1 },
      setFlags: ['consent'],
    },
    p17: {
      next: 'ending',
      previewAsset: 'p17',
      actionLabel: '第六步備選',
      setFlags: ['evidence'],
    },
    p18: {
      next: 'ending',
      previewAsset: 'p18',
      actionLabel: '第六步備選',
    },
  }),
  endingRules: [
    {
      id: 'normal',
      priority: 100,
      conditions: {},
    },
    {
      id: 'intimacy',
      priority: 300,
      conditions: {
        allFlags: ['consent'],
        minimumStats: { trust: 4, intimacy: 3 },
      },
    },
    {
      id: 'main',
      priority: 200,
      conditions: {
        allFlags: ['evidence'],
      },
    },
  ],
  endingContent: {
    intimacy: {
      title: 'Intimacy ending',
      asset: 'settlement_intimacy',
      clueIds: ['existing-clue', 'new-clue', 'new-clue'],
      galleryUnlocks: [
        'existing-gallery',
        'new-gallery',
        'new-gallery',
      ],
    },
    main: {
      title: 'Main ending',
      asset: 'settlement_main',
      clueIds: ['main-clue'],
      galleryUnlocks: ['main-gallery'],
    },
    normal: emptyEnding,
  },
}

const earlyEndingRoom: RoomDefinition = {
  ...settlementRoom,
  id: 'early-ending',
  panels: {
    ...settlementRoom.panels,
    p1: {
      ...settlementRoom.panels.p1!,
      next: 'ending',
    },
  },
}

const roomASettlementRoom: RoomDefinition = {
  ...settlementRoom,
  id: 'room_a_blackout',
  panels: {
    ...settlementRoom.panels,
    p7: {
      ...settlementRoom.panels.p7!,
      setFlags: ['a_symbol_traced'],
    },
  },
}

function createStorage(
  onSet?: (key: string, value: string) => void,
): StorageAdapter {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      onSet?.(key, value)
      values.set(key, value)
    },
  }
}

function createFailingStorage(): {
  storage: StorageAdapter
  values: Map<string, string>
  failPrimaryWrites: { current: boolean }
} {
  const values = new Map<string, string>()
  const failPrimaryWrites = { current: false }

  return {
    values,
    failPrimaryWrites,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (key === PROGRESS_KEY && failPrimaryWrites.current) {
          throw new DOMException('quota exceeded', 'QuotaExceededError')
        }
        values.set(key, value)
      },
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })

  return { promise, resolve }
}

function savedSnapshot(
  overrides: Partial<StorySnapshot> = {},
): StorySnapshot {
  return {
    roomId: room.id,
    currentNode: 'n2',
    choiceCount: 1,
    chosenPanels: ['p1'],
    stats: { affection: 0, trust: 1, intimacy: 0 },
    flags: { clue: true },
    ...overrides,
  }
}

function savedProgressWithCurrentRun(currentRun: unknown) {
  return {
    ...createEmptyProgress(),
    currentRun,
    completedEndings: {
      [room.id]: ['main'],
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

function invalidRouteCurrentRun() {
  return {
    roomId: room.id,
    lockedPanelId: 'p4',
    snapshot: savedSnapshot({
      currentNode: 'ending',
      chosenPanels: ['p4'],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: {},
    }),
  }
}

function chooseAndFinish(
  store: AppStoreApi,
  panelIds: string[],
): void {
  for (const panelId of panelIds) {
    store.getState().choosePanel(panelId)
    store.getState().finishReveal()
  }
}

test('persists on a replayed engine before locking or mutating the live engine', async () => {
  let store: AppStoreApi
  let choiceLockedAtSave: boolean | undefined
  let revealedPanelIdAtSave: string | null | undefined
  let liveSnapshotAtSave: StorySnapshot | undefined
  let savedValue = ''
  const storage = createStorage((key, value) => {
    if (key !== PROGRESS_KEY) return
    choiceLockedAtSave = store.getState().choiceLocked
    revealedPanelIdAtSave = store.getState().revealedPanelId
    const liveEngine = store.getState().engine
    liveSnapshotAtSave = liveEngine instanceof StoryEngine
      ? structuredClone(liveEngine.snapshot)
      : undefined
    savedValue = value
  })
  store = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await store.getState().startRoom(room.id)

  store.getState().choosePanel('p1')

  const savedRun = JSON.parse(savedValue).currentRun as {
    lockedPanelId: string
    snapshot: StorySnapshot
  }
  expect(choiceLockedAtSave).toBe(false)
  expect(revealedPanelIdAtSave).toBeNull()
  expect(liveSnapshotAtSave).toMatchObject({
    currentNode: 'n1',
    choiceCount: 0,
    chosenPanels: [],
    stats: { trust: 0 },
  })
  expect(savedRun.lockedPanelId).toBe('p1')
  expect(savedRun.snapshot.currentNode).toBe('n2')
  expect(savedRun.snapshot.stats.trust).toBe(1)
  expect(store.getState().revealedPanelId).toBe('p1')
})

test('choice save failure leaves the live engine and candidates selectable', async () => {
  const failing = createFailingStorage()
  const store = createAppStore({
    storage: failing.storage,
    loadRoom: async () => room,
  })
  await store.getState().startRoom(room.id)
  const before = structuredClone(store.getState().engine?.snapshot)
  failing.failPrimaryWrites.current = true

  store.getState().choosePanel('p1')

  expect(store.getState().engine?.snapshot).toEqual(before)
  expect(store.getState()).toMatchObject({
    choiceLocked: false,
    revealedPanelId: null,
    error: {
      actionLabel: '重新保存選擇',
    },
  })
  expect(store.getState().engine?.getCandidates().map(({ id }) => id))
    .toEqual(['p1', 'p2', 'p3'])
})

test('choice save can be retried without applying the choice twice', async () => {
  const failing = createFailingStorage()
  const store = createAppStore({
    storage: failing.storage,
    loadRoom: async () => room,
  })
  await store.getState().startRoom(room.id)
  failing.failPrimaryWrites.current = true
  store.getState().choosePanel('p1')

  failing.failPrimaryWrites.current = false
  store.getState().retryError()

  expect(store.getState()).toMatchObject({
    error: null,
    choiceLocked: true,
    revealedPanelId: 'p1',
  })
  expect(store.getState().engine?.snapshot).toMatchObject({
    choiceCount: 1,
    chosenPanels: ['p1'],
    stats: { trust: 1 },
  })
})

test('reloads an unfinished reveal as locked and unread', async () => {
  const storage = createStorage()
  const firstStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await firstStore.getState().startRoom(room.id)
  firstStore.getState().choosePanel('p1')
  const expectedSnapshot = structuredClone(
    firstStore.getState().engine?.snapshot,
  )

  const reloadedStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await reloadedStore.getState().resumeCurrentRun()

  expect(reloadedStore.getState()).toMatchObject({
    screen: 'comic',
    selectedRoomId: room.id,
    choiceLocked: true,
    revealedPanelId: 'p1',
  })
  expect(reloadedStore.getState().engine?.snapshot).toEqual(
    expectedSnapshot,
  )
  expect(wasRead(
    reloadedStore.getState().progress.readHistory,
    'p1',
    'cross_room',
  )).toBe(false)
})

test.each([
  [
    'locked panel without snapshot',
    {
      roomId: room.id,
      lockedPanelId: 'p1',
    },
  ],
  [
    'snapshot room mismatch',
    {
      roomId: room.id,
      lockedPanelId: 'p1',
      snapshot: savedSnapshot({ roomId: 'another-room' }),
    },
  ],
  [
    'locked panel and final chosen panel mismatch',
    {
      roomId: room.id,
      lockedPanelId: 'p1',
      snapshot: savedSnapshot({
        chosenPanels: ['p2'],
        stats: { affection: 0, trust: 0, intimacy: 0 },
        flags: {},
      }),
    },
  ],
])(
  'does not resume %s as a fresh choice-zero run',
  async (_name, currentRun) => {
    const storage = createStorage()
    storage.setItem(
      PROGRESS_KEY,
      JSON.stringify(savedProgressWithCurrentRun(currentRun)),
    )
    const loadRoom = vi.fn(async () => room)
    const store = createAppStore({ storage, loadRoom })

    await store.getState().resumeCurrentRun()

    expect(loadRoom).not.toHaveBeenCalled()
    expect(store.getState()).toMatchObject({
      screen: 'building',
      engine: null,
      choiceLocked: false,
      revealedPanelId: null,
      progress: {
        currentRun: null,
        completedEndings: {
          [room.id]: ['main'],
        },
        clues: ['kept-clue'],
        galleryUnlocks: ['kept-gallery'],
        settings: {
          adultContent: false,
          exactStats: true,
          autoFastForward: false,
        },
      },
    })
    expect(JSON.parse(
      storage.getItem(PROGRESS_KEY) ?? '{}',
    ).currentRun).toBeNull()
  },
)

test('clears a structurally valid snapshot that cannot replay through the room', async () => {
  const storage = createStorage()
  storage.setItem(
    PROGRESS_KEY,
    JSON.stringify(
      savedProgressWithCurrentRun(invalidRouteCurrentRun()),
    ),
  )
  const store = createAppStore({
    storage,
    loadRoom: async () => room,
  })

  await store.getState().resumeCurrentRun()

  expect(store.getState()).toMatchObject({
    screen: 'building',
    engine: null,
    choiceLocked: false,
    revealedPanelId: null,
    error: null,
    progress: {
      currentRun: null,
      completedEndings: {
        [room.id]: ['main'],
      },
      clues: ['kept-clue'],
      galleryUnlocks: ['kept-gallery'],
    },
  })
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  ).currentRun).toBeNull()
})

test('offers retry when invalid replay cleanup cannot be persisted', async () => {
  const failing = createFailingStorage()
  failing.values.set(
    PROGRESS_KEY,
    JSON.stringify(
      savedProgressWithCurrentRun(invalidRouteCurrentRun()),
    ),
  )
  const store = createAppStore({
    storage: failing.storage,
    loadRoom: async () => room,
  })
  failing.failPrimaryWrites.current = true

  await store.getState().resumeCurrentRun()

  expect(store.getState()).toMatchObject({
    screen: 'building',
    engine: null,
    progress: {
      currentRun: {
        lockedPanelId: 'p4',
      },
    },
    error: {
      actionLabel: '重試清理存檔',
    },
  })

  failing.failPrimaryWrites.current = false
  store.getState().retryError()

  await vi.waitFor(() => {
    expect(store.getState()).toMatchObject({
      error: null,
      engine: null,
      progress: {
        currentRun: null,
      },
    })
  })
  expect(JSON.parse(
    failing.values.get(PROGRESS_KEY) ?? '{}',
  ).currentRun).toBeNull()
})

test('marks the dialogue variant read only after reveal finishes', async () => {
  const storage = createStorage()
  const store = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await store.getState().startRoom(room.id)

  store.getState().choosePanel('p1')

  expect(wasRead(
    store.getState().progress.readHistory,
    'p1',
    'cross_room',
  )).toBe(false)

  store.getState().finishReveal('cross_room')

  expect(wasRead(
    store.getState().progress.readHistory,
    'p1',
    'cross_room',
  )).toBe(true)
  expect(wasRead(
    store.getState().progress.readHistory,
    'p1',
    'default',
  )).toBe(false)
  expect(store.getState().progress.currentRun).toEqual({
    roomId: room.id,
    snapshot: store.getState().engine?.snapshot,
  })
  expect(store.getState()).toMatchObject({
    choiceLocked: false,
    revealedPanelId: null,
  })
})

test('reveal save failure keeps the committed choice locked and retryable', async () => {
  const failing = createFailingStorage()
  const store = createAppStore({
    storage: failing.storage,
    loadRoom: async () => room,
  })
  await store.getState().startRoom(room.id)
  store.getState().choosePanel('p1')
  failing.failPrimaryWrites.current = true

  store.getState().finishReveal('cross_room')

  expect(store.getState()).toMatchObject({
    screen: 'comic',
    choiceLocked: true,
    revealedPanelId: 'p1',
    error: {
      actionLabel: '重新保存進度',
    },
  })
  expect(store.getState().engine?.snapshot).toMatchObject({
    choiceCount: 1,
    chosenPanels: ['p1'],
    currentNode: 'n2',
  })
  expect(wasRead(
    store.getState().progress.readHistory,
    'p1',
    'cross_room',
  )).toBe(false)

  failing.failPrimaryWrites.current = false
  store.getState().retryError()

  expect(store.getState()).toMatchObject({
    error: null,
    choiceLocked: false,
    revealedPanelId: null,
  })
  expect(wasRead(
    store.getState().progress.readHistory,
    'p1',
    'cross_room',
  )).toBe(true)
})

test('reloads a completed reveal at the next safe choice node', async () => {
  const storage = createStorage()
  const firstStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await firstStore.getState().startRoom(room.id)
  firstStore.getState().choosePanel('p1')
  firstStore.getState().finishReveal('cross_room')
  const expectedSnapshot = structuredClone(
    firstStore.getState().engine?.snapshot,
  )

  const reloadedStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await reloadedStore.getState().resumeCurrentRun()

  expect(reloadedStore.getState()).toMatchObject({
    screen: 'comic',
    selectedRoomId: room.id,
    choiceLocked: false,
    revealedPanelId: null,
  })
  expect(
    reloadedStore.getState().engine?.getCandidates().map(({ id }) => id),
  ).toEqual(['p4', 'p5', 'p6'])
  expect(reloadedStore.getState().engine?.snapshot).toEqual(
    expectedSnapshot,
  )
  expect(wasRead(
    reloadedStore.getState().progress.readHistory,
    'p1',
    'cross_room',
  )).toBe(true)
})

test('ignores an older resume after a newer resume advances the run', async () => {
  const storage = createStorage()
  const initialStore = createAppStore({
    storage,
    loadRoom: async () => room,
  })
  await initialStore.getState().startRoom(room.id)
  initialStore.getState().choosePanel('p1')
  initialStore.getState().finishReveal('cross_room')

  const olderLoad = createDeferred<RoomDefinition>()
  const newerLoad = createDeferred<RoomDefinition>()
  const loads = [olderLoad, newerLoad]
  let loadIndex = 0
  const store = createAppStore({
    storage,
    loadRoom: () => loads[loadIndex++]!.promise,
  })

  const olderResume = store.getState().resumeCurrentRun()
  const newerResume = store.getState().resumeCurrentRun()
  newerLoad.resolve(room)
  await newerResume
  store.getState().choosePanel('p4')

  olderLoad.resolve(room)
  await olderResume

  expect(store.getState()).toMatchObject({
    screen: 'comic',
    selectedRoomId: room.id,
    choiceLocked: true,
    revealedPanelId: 'p4',
  })
  expect(store.getState().engine?.snapshot).toMatchObject({
    choiceCount: 2,
    chosenPanels: ['p1', 'p4'],
    currentNode: 'ending',
  })
  expect(store.getState().progress.currentRun).toMatchObject({
    roomId: room.id,
    lockedPanelId: 'p4',
    snapshot: {
      choiceCount: 2,
      chosenPanels: ['p1', 'p4'],
      currentNode: 'ending',
    },
  })
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  ).currentRun).toMatchObject({
    lockedPanelId: 'p4',
    snapshot: {
      choiceCount: 2,
      chosenPanels: ['p1', 'p4'],
    },
  })
})

test('selecting a room invalidates an unfinished start request', async () => {
  const pendingLoad = createDeferred<RoomDefinition>()
  const store = createAppStore({
    storage: createStorage(),
    loadRoom: () => pendingLoad.promise,
  })

  const pendingStart = store.getState().startRoom(room.id)
  store.getState().selectRoom('room_b_wall')
  pendingLoad.resolve(room)
  await pendingStart

  expect(store.getState()).toMatchObject({
    screen: 'roomBrief',
    selectedRoomId: 'room_b_wall',
    engine: null,
    choiceLocked: false,
    revealedPanelId: null,
  })
})

test('selects a room and routes to its briefing', () => {
  const store = createAppStore({
    storage: createStorage(),
    loadRoom: async () => room,
  })

  store.getState().selectRoom('room_b_wall')

  expect(store.getState()).toMatchObject({
    selectedRoomId: 'room_b_wall',
    screen: 'roomBrief',
  })
})

test('start failure stays on the briefing, exposes retry, and later succeeds', async () => {
  let shouldFail = true
  const store = createAppStore({
    storage: createStorage(),
    loadRoom: async () => {
      if (shouldFail) throw new Error('temporary room failure')
      return room
    },
  })
  store.getState().selectRoom(room.id)

  await expect(
    store.getState().startRoom(room.id),
  ).resolves.toBeUndefined()

  expect(store.getState()).toMatchObject({
    screen: 'roomBrief',
    selectedRoomId: room.id,
    engine: null,
    error: {
      actionLabel: '重試載入',
    },
  })

  shouldFail = false
  store.getState().retryError()
  await vi.waitFor(() => {
    expect(store.getState()).toMatchObject({
      screen: 'comic',
      selectedRoomId: room.id,
      error: null,
    })
  })
})

test('resume failure preserves the unfinished run and succeeds on retry', async () => {
  const storage = createStorage()
  const progress = createEmptyProgress()
  const savedEngine = new StoryEngine(room)
  savedEngine.choose('p1')
  progress.currentRun = {
    roomId: room.id,
    lockedPanelId: 'p1',
    snapshot: structuredClone(savedEngine.snapshot),
  }
  saveProgress(storage, progress)
  let shouldFail = true
  const store = createAppStore({
    storage,
    loadRoom: async () => {
      if (shouldFail) throw new Error('temporary resume failure')
      return room
    },
  })

  await expect(
    store.getState().resumeCurrentRun(),
  ).resolves.toBeUndefined()

  expect(store.getState()).toMatchObject({
    screen: 'building',
    engine: null,
    progress: {
      currentRun: {
        roomId: room.id,
        lockedPanelId: 'p1',
      },
    },
    error: {
      actionLabel: '重試載入',
    },
  })

  shouldFail = false
  store.getState().retryError()
  await vi.waitFor(() => {
    expect(store.getState()).toMatchObject({
      screen: 'comic',
      selectedRoomId: room.id,
      choiceLocked: true,
      revealedPanelId: 'p1',
      error: null,
    })
  })
})

test('settles the priority ending only after the sixth reveal finishes', async () => {
  const storage = createStorage()
  const progress = createEmptyProgress()
  progress.completedEndings[settlementRoom.id] = ['main', 'intimacy']
  const siblingRecap = ['same-room-main']
  const otherRoomRecap = ['other-room-normal']
  progress.endingRecaps[settlementRoom.id] = {
    main: siblingRecap,
    intimacy: ['outdated-panel'],
  }
  progress.endingRecaps.other_room = { normal: otherRoomRecap }
  progress.clues = ['existing-clue']
  progress.galleryUnlocks = ['existing-gallery']
  saveProgress(storage, progress)
  const store = createAppStore({
    storage,
    loadRoom: async () => settlementRoom,
  })
  await store.getState().startRoom(settlementRoom.id)

  chooseAndFinish(store, ['p1', 'p4', 'p7', 'p10', 'p13'])
  store.getState().choosePanel('p16')

  expect(store.getState()).toMatchObject({
    screen: 'comic',
    choiceLocked: true,
    revealedPanelId: 'p16',
    settledResult: null,
  })
  expect(store.getState().progress.currentRun).toMatchObject({
    roomId: settlementRoom.id,
    lockedPanelId: 'p16',
  })
  expect(store.getState().progress.clues).toEqual(['existing-clue'])

  store.getState().finishReveal()

  expect(store.getState()).toMatchObject({
    screen: 'result',
    choiceLocked: false,
    revealedPanelId: null,
    settledResult: {
      roomId: settlementRoom.id,
      endingId: 'intimacy',
      newClues: ['new-clue'],
      newGalleryUnlocks: ['new-gallery'],
    },
  })
  expect(store.getState().engine?.snapshot).toMatchObject({
    choiceCount: 6,
    currentNode: 'ending',
    stats: { trust: 4, intimacy: 3 },
  })
  expect(store.getState().progress).toMatchObject({
    currentRun: null,
    completedEndings: {
      [settlementRoom.id]: ['main', 'intimacy'],
    },
    endingRecaps: {
      [settlementRoom.id]: {
        main: siblingRecap,
        intimacy: ['p1', 'p4', 'p7', 'p10', 'p13', 'p16'],
      },
      other_room: { normal: otherRoomRecap },
    },
    clues: ['existing-clue', 'new-clue'],
    galleryUnlocks: ['existing-gallery', 'new-gallery'],
  })
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  )).toMatchObject({
    currentRun: null,
    completedEndings: {
      [settlementRoom.id]: ['main', 'intimacy'],
    },
    endingRecaps: {
      [settlementRoom.id]: {
        main: siblingRecap,
        intimacy: ['p1', 'p4', 'p7', 'p10', 'p13', 'p16'],
      },
      other_room: { normal: otherRoomRecap },
    },
    clues: ['existing-clue', 'new-clue'],
    galleryUnlocks: ['existing-gallery', 'new-gallery'],
  })
  expect(loadProgress(storage).endingRecaps).toEqual({
    [settlementRoom.id]: {
      main: siblingRecap,
      intimacy: ['p1', 'p4', 'p7', 'p10', 'p13', 'p16'],
    },
    other_room: { normal: otherRoomRecap },
  })
})

test('settlement save failure preserves the locked ending choice until retry', async () => {
  const failing = createFailingStorage()
  const store = createAppStore({
    storage: failing.storage,
    loadRoom: async () => settlementRoom,
  })
  await store.getState().startRoom(settlementRoom.id)
  chooseAndFinish(store, ['p1', 'p4', 'p7', 'p10', 'p13'])
  store.getState().choosePanel('p16')
  failing.failPrimaryWrites.current = true

  store.getState().finishReveal()

  expect(store.getState()).toMatchObject({
    screen: 'comic',
    choiceLocked: true,
    revealedPanelId: 'p16',
    settledResult: null,
    error: {
      actionLabel: '重新保存進度',
    },
  })
  expect(store.getState().progress.currentRun).toMatchObject({
    lockedPanelId: 'p16',
  })
  expect(store.getState().progress.endingRecaps).toEqual({})

  failing.failPrimaryWrites.current = false
  store.getState().retryError()

  expect(store.getState()).toMatchObject({
    screen: 'result',
    error: null,
    settledResult: {
      endingId: 'intimacy',
    },
  })
  expect(store.getState().progress.endingRecaps).toEqual({
    [settlementRoom.id]: {
      intimacy: ['p1', 'p4', 'p7', 'p10', 'p13', 'p16'],
    },
  })
})

test('settings write failure keeps the previous value and offers retry', () => {
  const failing = createFailingStorage()
  const store = createAppStore({ storage: failing.storage })
  failing.failPrimaryWrites.current = true

  store.getState().updateSetting('adultContent', false)

  expect(store.getState().progress.settings.adultContent).toBe(true)
  expect(store.getState().error).toMatchObject({
    actionLabel: '重新保存設定',
  })

  failing.failPrimaryWrites.current = false
  store.getState().retryError()

  expect(store.getState().progress.settings.adultContent).toBe(false)
  expect(store.getState().error).toBeNull()
})

test('rejects an ending anchor reached before the sixth reveal', async () => {
  const storage = createStorage()
  const store = createAppStore({
    storage,
    loadRoom: async () => earlyEndingRoom,
  })
  await store.getState().startRoom(earlyEndingRoom.id)
  store.getState().choosePanel('p1')

  expect(() => store.getState().finishReveal()).toThrow(
    'ending anchor reached after 1 choices; expected 6',
  )

  expect(store.getState()).toMatchObject({
    screen: 'comic',
    choiceLocked: true,
    revealedPanelId: 'p1',
    settledResult: null,
    progress: {
      completedEndings: {},
      clues: [],
      galleryUnlocks: [],
      currentRun: {
        roomId: earlyEndingRoom.id,
        lockedPanelId: 'p1',
        snapshot: {
          choiceCount: 1,
          currentNode: 'ending',
        },
      },
    },
  })
  expect(wasRead(
    store.getState().progress.readHistory,
    'p1',
    'default',
  )).toBe(false)
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  )).toMatchObject({
    completedEndings: {},
    clues: [],
    galleryUnlocks: [],
    currentRun: {
      roomId: earlyEndingRoom.id,
      lockedPanelId: 'p1',
      snapshot: {
        choiceCount: 1,
        currentNode: 'ending',
      },
    },
  })
})

test('adult-off play still persists an intimacy completion', async () => {
  const storage = createStorage()
  const progress = createEmptyProgress()
  progress.settings.adultContent = false
  saveProgress(storage, progress)
  const store = createAppStore({
    storage,
    loadRoom: async () => settlementRoom,
  })
  await store.getState().startRoom(settlementRoom.id)

  chooseAndFinish(
    store,
    ['p1', 'p4', 'p7', 'p10', 'p13', 'p16'],
  )

  expect(store.getState().settledResult?.endingId).toBe('intimacy')
  expect(
    store.getState().progress.completedEndings[settlementRoom.id],
  ).toEqual(['intimacy'])
  expect(store.getState().progress.settings.adultContent).toBe(false)
})

test.each([
  ['traced', 'p7', true],
  ['untraced', 'p8', false],
])(
  'Room A main settlement saves both cross-room outputs when %s',
  async (_case, symbolPanelId, symbolTraced) => {
    const savedProgress: string[] = []
    const storage = createStorage((key, value) => {
      if (key === PROGRESS_KEY) savedProgress.push(value)
    })
    const store = createAppStore({
      storage,
      loadRoom: async () => roomASettlementRoom,
    })
    await store.getState().startRoom(roomASettlementRoom.id)

    chooseAndFinish(
      store,
      ['p1', 'p4', symbolPanelId, 'p10', 'p13'],
    )
    store.getState().choosePanel('p17')
    const writesBeforeSettlement = savedProgress.length

    store.getState().finishReveal()

    expect(store.getState().settledResult?.endingId).toBe('main')
    expect(savedProgress).toHaveLength(writesBeforeSettlement + 1)
    expect(store.getState().progress.crossRoomFlags).toMatchObject({
      a_hidden_circuit: true,
      a_symbol_traced: symbolTraced,
    })
    expect(JSON.parse(savedProgress.at(-1) ?? '{}')).toMatchObject({
      currentRun: null,
      crossRoomFlags: {
        a_hidden_circuit: true,
        a_symbol_traced: symbolTraced,
      },
    })
  },
)

test('Room A non-main settlement does not write main outputs', async () => {
  const storage = createStorage()
  const store = createAppStore({
    storage,
    loadRoom: async () => roomASettlementRoom,
  })
  await store.getState().startRoom(roomASettlementRoom.id)

  chooseAndFinish(
    store,
    ['p1', 'p4', 'p7', 'p10', 'p13', 'p18'],
  )

  expect(store.getState().settledResult?.endingId).toBe('normal')
  expect(store.getState().progress.crossRoomFlags).toEqual({})
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  ).crossRoomFlags).toEqual({})
})
