import { describe, expect, test } from 'vitest'
import { DraftStoryEngine } from '@/domain/draft-story-engine'
import type { PanelDefinition, RoomDefinition } from '@/domain/types'

function createRoom(): RoomDefinition {
  const panels = Object.fromEntries(
    Array.from({ length: 24 }, (_, index) => {
      const id = `p${index + 1}`
      const panel: PanelDefinition = {
        next: 'ending',
        previewAsset: id,
        actionLabel: `行動 ${index + 1}`,
        dialogue: [`第 ${index + 1} 張卡的劇情。`],
        effects: index < 6 ? { trust: 1 } : undefined,
        setFlags: index === 0 ? ['required_clue'] : undefined,
      }
      return [id, panel]
    }),
  )

  return {
    schemaVersion: 1,
    id: 'draft-fixture',
    title: 'Draft fixture',
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
      requiredDealPanels: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p24'],
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
        conditions: { allFlags: ['required_clue'] },
      },
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
}

describe('DraftStoryEngine', () => {
  test('deals twelve deterministic unique cards and keeps required cards', () => {
    const room = createRoom()
    const first = new DraftStoryEngine(room, {}, undefined, 'seed-a')
    const second = new DraftStoryEngine(room, {}, undefined, 'seed-a')
    const another = new DraftStoryEngine(room, {}, undefined, 'seed-b')

    expect(first.snapshot.dealtPanels).toHaveLength(12)
    expect(new Set(first.snapshot.dealtPanels).size).toBe(12)
    expect(first.snapshot.dealtPanels).toEqual(
      second.snapshot.dealtPanels,
    )
    expect(first.snapshot.dealtPanels).not.toEqual(
      another.snapshot.dealtPanels,
    )
    expect(first.snapshot.dealtPanels).toEqual(
      expect.arrayContaining(['p1', 'p24']),
    )
  })

  test('allows placing, swapping, moving, and removing before confirm', () => {
    const engine = new DraftStoryEngine(
      createRoom(),
      {},
      undefined,
      'arrange',
    )
    const [first, second, third] = engine.snapshot.dealtPanels

    engine.place(first!, 0)
    engine.place(second!, 1)
    engine.place(third!, 0)

    expect(engine.snapshot.slots.slice(0, 2)).toEqual([
      third,
      second,
    ])
    expect(engine.snapshot.slots).not.toContain(first)

    engine.move(0, 1)
    expect(engine.snapshot.slots.slice(0, 2)).toEqual([
      second,
      third,
    ])

    expect(engine.remove(1)).toBe(third)
    expect(engine.snapshot.slots[1]).toBeNull()
    expect(engine.snapshot.stats).toEqual({
      affection: 0,
      trust: 0,
      intimacy: 0,
    })
  })

  test('requires six cards, then locks the complete arrangement', () => {
    const engine = new DraftStoryEngine(
      createRoom(),
      {},
      undefined,
      'confirm',
    )

    for (const [index, panelId] of engine.snapshot.dealtPanels
      .slice(0, 5)
      .entries()) {
      engine.place(panelId, index)
    }
    expect(() => engine.confirm()).toThrow('six filled slots')

    engine.place(engine.snapshot.dealtPanels[5]!, 5)
    engine.confirm()

    expect(engine.snapshot.confirmed).toBe(true)
    expect(() => engine.remove(0)).toThrow('already confirmed')
    expect(() => engine.move(0, 1)).toThrow('already confirmed')
  })

  test('reveals the confirmed cards in slot order and applies effects then', () => {
    const engine = new DraftStoryEngine(
      createRoom(),
      {},
      undefined,
      'reveal',
    )
    const selected = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

    for (const [index, panelId] of selected.entries()) {
      engine.place(panelId, index)
    }
    engine.confirm()

    expect(engine.currentReveal()?.id).toBe('p1')
    expect(engine.snapshot.stats.trust).toBe(0)

    expect(engine.finishCurrentReveal().id).toBe('p1')
    expect(engine.snapshot.stats.trust).toBe(1)
    expect(engine.snapshot.flags.required_clue).toBe(true)
    expect(engine.currentReveal()?.id).toBe('p2')

    for (let index = 1; index < selected.length; index += 1) {
      engine.finishCurrentReveal()
    }

    expect(engine.isComplete()).toBe(true)
    expect(engine.currentReveal()).toBeNull()
    expect(engine.snapshot.stats.trust).toBe(6)
  })

  test('rejects forged saved effects and restores a fresh draft', () => {
    const room = createRoom()
    const original = new DraftStoryEngine(
      room,
      {},
      undefined,
      'saved',
    )
    for (const [index, panelId] of original.snapshot.dealtPanels
      .slice(0, 6)
      .entries()) {
      original.place(panelId, index)
    }
    original.confirm()
    original.finishCurrentReveal()

    const forged = structuredClone(original.snapshot)
    forged.stats.trust = 999
    const restored = new DraftStoryEngine(room, {}, forged, 'ignored')

    expect(restored.restoredFromSavedSnapshot).toBe(false)
    expect(restored.snapshot.confirmed).toBe(false)
    expect(restored.snapshot.revealCount).toBe(0)
    expect(restored.snapshot.stats.trust).toBe(0)
  })
})
