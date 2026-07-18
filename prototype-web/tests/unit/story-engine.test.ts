import { describe, expect, test } from 'vitest'
import { StoryEngine } from '@/domain/story-engine'
import type { RoomDefinition } from '@/domain/types'

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
  panels: {
    p1: {
      next: 'n2',
      previewAsset: 'p1',
      dialogue: ['Fixture dialogue'],
      actionLabel: '查看門口',
      effects: { trust: 1 },
      setFlags: ['clue'],
    },
    p2: {
      next: 'n2',
      previewAsset: 'p2',
      dialogue: ['Fixture dialogue'],
      actionLabel: '檢查桌面',
    },
    p3: {
      next: 'n2',
      previewAsset: 'p3',
      dialogue: ['Fixture dialogue'],
      actionLabel: '留在原地',
    },
    p4: {
      next: 'ending',
      previewAsset: 'p4',
      dialogue: ['Fixture dialogue'],
      actionLabel: '走向窗邊',
    },
    p5: {
      next: 'ending',
      previewAsset: 'p5',
      dialogue: ['Fixture dialogue'],
      actionLabel: '撥打電話',
    },
    p6: {
      next: 'ending',
      previewAsset: 'p6',
      dialogue: ['Fixture dialogue'],
      actionLabel: '關上房門',
    },
  },
  endingRules: [
    {
      id: 'intimacy',
      priority: 300,
      conditions: { allFlags: ['consent'] },
    },
    { id: 'main', priority: 200, conditions: { allFlags: ['clue'] } },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    main: {
      title: 'Main',
      asset: 'main',
      clueIds: [],
      galleryUnlocks: [],
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

describe('StoryEngine', () => {
  test('returns exactly three current candidates', () => {
    expect(new StoryEngine(room).getCandidates()).toHaveLength(3)
  })

  test('locks selection and applies state', () => {
    const engine = new StoryEngine(room)

    expect(engine.choose('p1').id).toBe('p1')
    expect(engine.snapshot.stats.trust).toBe(1)
    expect(engine.snapshot.flags.clue).toBe(true)
    expect(engine.snapshot.currentNode).toBe('n2')
  })

  test('rejects a panel outside current candidates', () => {
    const engine = new StoryEngine(room)

    expect(() => engine.choose('p4')).toThrow('not a current candidate')
  })

  test('hydrates a saved post-choice snapshot', () => {
    const inheritedFlags = { cross_room: true }
    const original = new StoryEngine(room, inheritedFlags)
    original.choose('p1')

    const restored = new StoryEngine(
      room,
      inheritedFlags,
      structuredClone(original.snapshot),
    )

    expect(restored.snapshot).toEqual(original.snapshot)
    expect(restored.getCandidates().map(({ id }) => id)).toEqual([
      'p4',
      'p5',
      'p6',
    ])
  })

  test('rejects a saved panel that was not a candidate at that step', () => {
    const savedSnapshot = {
      roomId: room.id,
      currentNode: 'ending',
      choiceCount: 1,
      chosenPanels: ['p4'],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: {},
    }

    const restored = new StoryEngine(room, {}, savedSnapshot)

    expect(restored.snapshot).toEqual(new StoryEngine(room).snapshot)
  })

  test.each([
    {
      label: 'forged stats',
      mutate(snapshot: StoryEngine['snapshot']) {
        snapshot.stats.trust = 999
      },
    },
    {
      label: 'forged flags',
      mutate(snapshot: StoryEngine['snapshot']) {
        snapshot.flags.forged = true
      },
    },
  ])('rejects $label in a saved snapshot', ({ mutate }) => {
    const original = new StoryEngine(room)
    original.choose('p1')
    const savedSnapshot = structuredClone(original.snapshot)
    mutate(savedSnapshot)

    const restored = new StoryEngine(room, {}, savedSnapshot)

    expect(restored.snapshot).toEqual(new StoryEngine(room).snapshot)
  })

  test('rejects a zero-choice snapshot at the ending anchor', () => {
    const savedSnapshot = {
      roomId: room.id,
      currentNode: 'ending',
      choiceCount: 0,
      chosenPanels: [],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: {},
    }

    const restored = new StoryEngine(room, {}, savedSnapshot)

    expect(restored.snapshot).toEqual(new StoryEngine(room).snapshot)
  })

  test('rejects a snapshot with more than six choices', () => {
    const savedSnapshot = {
      roomId: room.id,
      currentNode: 'n2',
      choiceCount: 7,
      chosenPanels: Array<string>(7).fill('p1'),
      stats: { affection: 0, trust: 7, intimacy: 0 },
      flags: { clue: true },
    }

    const restored = new StoryEngine(room, {}, savedSnapshot)

    expect(restored.snapshot).toEqual(new StoryEngine(room).snapshot)
  })
})
