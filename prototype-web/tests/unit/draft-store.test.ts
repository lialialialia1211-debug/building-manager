import { describe, expect, test } from 'vitest'
import {
  createAppStore,
  type AppStoreDependencies,
} from '@/app/store'
import type { PlaytestRecorder } from '@/analytics/playtest-log'
import { DraftStoryEngine } from '@/domain/draft-story-engine'
import {
  PROGRESS_KEY,
  createEmptyProgress,
  type StorageAdapter,
} from '@/domain/progress'
import type { PanelDefinition, RoomDefinition } from '@/domain/types'

const recorder: PlaytestRecorder = { record() {} }

function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

function createRoom(): RoomDefinition {
  const panels = Object.fromEntries(
    Array.from({ length: 24 }, (_, index) => {
      const id = `p${index + 1}`
      const panel: PanelDefinition = {
        next: 'ending',
        previewAsset: id,
        actionLabel: `行動 ${index + 1}`,
        dialogue: [`第 ${index + 1} 張卡的完整事件。`],
        effects: index < 6 ? { trust: 1 } : undefined,
        setFlags: index === 0 ? ['main_clue'] : undefined,
      }
      return [id, panel]
    }),
  )

  return {
    schemaVersion: 1,
    id: 'draft-store',
    title: 'Draft store',
    backgroundAsset: 'building_fixture',
    openingAssets: ['fixture_open_01', 'fixture_open_02', 'fixture_open_03'],
    startNode: 'legacy',
    safeNode: 'legacy',
    endingAnchor: 'ending',
    nodes: {
      legacy: { candidates: ['p1', 'p2', 'p3'] },
    },
    panels,
    drafting: {
      dealSize: 12,
      selectionSize: 6,
      requiredDealPanels: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    },
    endingRules: [
      {
        id: 'intimacy',
        priority: 300,
        conditions: { allFlags: ['consent'] },
      },
      {
        id: 'main',
        priority: 200,
        conditions: {
          allFlags: ['main_clue'],
          minimumStats: { trust: 6 },
        },
      },
      { id: 'normal', priority: 100, conditions: {} },
    ],
    endingContent: {
      main: {
        title: 'Main',
        asset: 'main',
        clueIds: ['main_clue'],
        galleryUnlocks: ['main_gallery'],
      },
      normal: {
        title: 'Normal',
        asset: 'normal',
        clueIds: [],
        galleryUnlocks: [],
      },
      intimacy: {
        title: 'Intimacy',
        asset: 'intimacy',
        clueIds: [],
        galleryUnlocks: [],
      },
    },
  }
}

function createStore(
  storage: StorageAdapter,
  room: RoomDefinition,
) {
  const dependencies: AppStoreDependencies = {
    storage,
    loadRoom: async () => room,
    recorder,
    createRunSeed: () => 'store-seed',
  }
  return createAppStore(dependencies)
}

describe('drafting store flow', () => {
  test('starts by saving a resumable twelve-card draft', async () => {
    const storage = createStorage()
    const room = createRoom()
    const store = createStore(storage, room)

    await store.getState().startRoom(room.id)

    expect(store.getState().engine).toBeInstanceOf(DraftStoryEngine)
    expect(
      (store.getState().engine as DraftStoryEngine)
        .snapshot.dealtPanels,
    ).toHaveLength(12)
    expect(JSON.parse(
      storage.getItem(PROGRESS_KEY) ?? '{}',
    ).currentRun.snapshot).toMatchObject({
      mode: 'drafting',
      confirmed: false,
      revealCount: 0,
    })
  })

  test('persists free placement, swapping, and removal before confirm', async () => {
    const storage = createStorage()
    const room = createRoom()
    const store = createStore(storage, room)
    await store.getState().startRoom(room.id)

    store.getState().placePanel('p1', 0)
    store.getState().placePanel('p2', 1)
    store.getState().movePanel(0, 1)
    store.getState().removePanel(0)

    const engine = store.getState().engine as DraftStoryEngine
    expect(engine.snapshot.slots).toEqual([
      null,
      'p1',
      null,
      null,
      null,
      null,
    ])
    expect(JSON.parse(
      storage.getItem(PROGRESS_KEY) ?? '{}',
    ).currentRun.snapshot.slots).toEqual(engine.snapshot.slots)
  })

  test('confirms once, reveals six cards in order, and settles', async () => {
    const storage = createStorage()
    const room = createRoom()
    const store = createStore(storage, room)
    await store.getState().startRoom(room.id)

    for (let index = 0; index < 6; index += 1) {
      store.getState().placePanel(`p${index + 1}`, index)
    }
    store.getState().confirmArrangement()

    expect(store.getState()).toMatchObject({
      choiceLocked: true,
      revealedPanelId: 'p1',
    })

    for (let index = 0; index < 6; index += 1) {
      store.getState().finishReveal()
    }

    expect(store.getState()).toMatchObject({
      screen: 'result',
      settledResult: {
        roomId: room.id,
        endingId: 'main',
      },
      choiceLocked: false,
      revealedPanelId: null,
    })
    expect(store.getState().progress.currentRun).toBeNull()
    expect(store.getState().progress.endingRecaps).toEqual({
      [room.id]: {
        main: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      },
    })
  })

  test('resumes an unconfirmed arrangement without rerolling the deal', async () => {
    const storage = createStorage()
    const room = createRoom()
    const first = createStore(storage, room)
    await first.getState().startRoom(room.id)
    first.getState().placePanel('p1', 3)
    const original = structuredClone(
      (first.getState().engine as DraftStoryEngine).snapshot,
    )

    const resumed = createStore(storage, room)
    resumed.setState({
      progress: {
        ...createEmptyProgress(),
        currentRun: {
          roomId: room.id,
          snapshot: original,
        },
      },
    })
    await resumed.getState().resumeCurrentRun()

    expect(
      (resumed.getState().engine as DraftStoryEngine).snapshot,
    ).toEqual(original)
    expect(resumed.getState()).toMatchObject({
      choiceLocked: false,
      revealedPanelId: null,
    })
  })
})
