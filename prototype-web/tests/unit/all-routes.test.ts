import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseRoom } from '@/domain/content-schema'
import { resolveEnding } from '@/domain/ending-resolver'
import { StoryEngine } from '@/domain/story-engine'
import type {
  EndingId,
  PanelDefinition,
  RoomDefinition,
  StatName,
} from '@/domain/types'

interface ExpectedPanel {
  next: string
  effects?: Partial<Record<StatName, number>>
  setFlags?: string[]
}

interface Route {
  choices: string[]
  ending: EndingId
}

const prototypeDirectory = process.cwd()
const roomDirectory = resolve(prototypeDirectory, '../content/rooms')
const validationScript = resolve(
  prototypeDirectory,
  'scripts/validate-content.ts',
)

const roomANodes = {
  a1: ['a1_door', 'a1_fuse', 'a1_note'],
  a2_door: ['a2d_open', 'a2d_chain', 'a2d_listen'],
  a2_fuse: ['a2f_reset', 'a2f_tools', 'a2f_call'],
  a2_note: ['a2n_follow', 'a2n_photo', 'a2n_wait'],
  a3: ['a3_trace', 'a3_share', 'a3_candle'],
  a4: ['a4_ground', 'a4_comfort', 'a4_sleep'],
  a5: ['a5_photo', 'a5_ask', 'a5_ignore'],
  a6: ['a6_report', 'a6_consent', 'a6_morning'],
} as const

const roomAPanels: Record<string, ExpectedPanel> = {
  a1_door: { next: 'a2_door', effects: { trust: 1 } },
  a1_fuse: { next: 'a2_fuse', setFlags: ['a_checked_fuse'] },
  a1_note: { next: 'a2_note', setFlags: ['a_found_note'] },
  a2d_open: { next: 'a3', effects: { affection: 1 } },
  a2d_chain: { next: 'a3', effects: { trust: 1 } },
  a2d_listen: { next: 'a3', effects: { trust: 2 } },
  a2f_reset: { next: 'a3' },
  a2f_tools: {
    next: 'a3',
    effects: { trust: 1 },
    setFlags: ['a_hidden_circuit'],
  },
  a2f_call: { next: 'a3', effects: { affection: 1 } },
  a2n_follow: { next: 'a3', setFlags: ['a_symbol_seen'] },
  a2n_photo: { next: 'a3', setFlags: ['a_note_saved'] },
  a2n_wait: { next: 'a3' },
  a3_trace: { next: 'a4', setFlags: ['a_symbol_traced'] },
  a3_share: { next: 'a4', effects: { trust: 1 } },
  a3_candle: { next: 'a4', effects: { affection: 1 } },
  a4_ground: { next: 'a5', effects: { trust: 1 } },
  a4_comfort: {
    next: 'a5',
    effects: { affection: 1, trust: 1, intimacy: 1 },
  },
  a4_sleep: { next: 'a5' },
  a5_photo: { next: 'a6', setFlags: ['a_evidence'] },
  a5_ask: { next: 'a6', effects: { trust: 1, intimacy: 1 } },
  a5_ignore: { next: 'a6', effects: { trust: -1 } },
  a6_report: {
    next: 'ending',
    effects: { trust: 1 },
    setFlags: ['a_reported'],
  },
  a6_consent: {
    next: 'ending',
    effects: { intimacy: 2 },
    setFlags: ['a_consent'],
  },
  a6_morning: { next: 'ending' },
}

const roomBNodes = {
  b1: ['b1_glass', 'b1_knock', 'b1_neighbor'],
  b2_glass: ['b2g_mark', 'b2g_record', 'b2g_cover'],
  b2_knock: ['b2k_pattern', 'b2k_reply', 'b2k_stop'],
  b2_neighbor: ['b2n_invite', 'b2n_hall', 'b2n_refuse'],
  b3: ['b3_blueprint', 'b3_share', 'b3_music'],
  b4: ['b4_measure', 'b4_comfort', 'b4_leave'],
  b5: ['b5_record', 'b5_ask', 'b5_ignore'],
  b6: ['b6_open', 'b6_consent', 'b6_sleep'],
} as const

const roomBPanels: Record<string, ExpectedPanel> = {
  b1_glass: {
    next: 'b2_glass',
    effects: { trust: 1 },
    setFlags: ['b_sound_located'],
  },
  b1_knock: { next: 'b2_knock', effects: { trust: 1 } },
  b1_neighbor: {
    next: 'b2_neighbor',
    effects: { affection: 1, trust: 1 },
  },
  b2g_mark: { next: 'b3', setFlags: ['b_wall_mark'] },
  b2g_record: {
    next: 'b3',
    effects: { trust: 1 },
    setFlags: ['b_sound_recorded'],
  },
  b2g_cover: { next: 'b3' },
  b2k_pattern: { next: 'b3', effects: { trust: 1 } },
  b2k_reply: { next: 'b3', setFlags: ['b_reply'] },
  b2k_stop: { next: 'b3' },
  b2n_invite: { next: 'b3', effects: { affection: 1 } },
  b2n_hall: { next: 'b3', effects: { trust: 1 } },
  b2n_refuse: { next: 'b3', effects: { trust: -1 } },
  b3_blueprint: { next: 'b4', setFlags: ['b_blueprint_gap'] },
  b3_share: { next: 'b4', effects: { trust: 1 } },
  b3_music: { next: 'b4', effects: { affection: 1 } },
  b4_measure: {
    next: 'b5',
    effects: { trust: 1 },
    setFlags: ['b_hidden_space'],
  },
  b4_comfort: {
    next: 'b5',
    effects: { trust: 1, intimacy: 1 },
  },
  b4_leave: { next: 'b5' },
  b5_record: { next: 'b6', setFlags: ['b_evidence'] },
  b5_ask: { next: 'b6', effects: { trust: 1, intimacy: 1 } },
  b5_ignore: { next: 'b6', effects: { trust: -1 } },
  b6_open: {
    next: 'ending',
    effects: { trust: 1 },
    setFlags: ['b_opened_space'],
  },
  b6_consent: {
    next: 'ending',
    effects: { intimacy: 2 },
    setFlags: ['b_consent'],
  },
  b6_sleep: { next: 'ending' },
}

const roomAEndingRules = [
  {
    id: 'intimacy',
    priority: 300,
    conditions: {
      allFlags: ['a_consent'],
      minimumStats: {
        trust: 1,
        intimacy: 3,
      },
    },
  },
  {
    id: 'main',
    priority: 200,
    conditions: {
      allFlags: ['a_reported'],
      minimumStats: {
        trust: 1,
      },
    },
  },
  {
    id: 'normal',
    priority: 100,
    conditions: {},
  },
] satisfies RoomDefinition['endingRules']

const roomBEndingRules = [
  {
    id: 'intimacy',
    priority: 300,
    conditions: {
      allFlags: ['b_consent'],
      minimumStats: {
        trust: 1,
        intimacy: 3,
      },
    },
  },
  {
    id: 'main',
    priority: 200,
    conditions: {
      allFlags: ['b_opened_space'],
      minimumStats: {
        trust: 1,
      },
    },
  },
  {
    id: 'normal',
    priority: 100,
    conditions: {},
  },
] satisfies RoomDefinition['endingRules']

function loadRoom(roomId: string): RoomDefinition {
  const roomPath = resolve(roomDirectory, `${roomId}.json`)
  expect(
    existsSync(roomPath),
    `${roomId} content file should exist`,
  ).toBe(true)
  return parseRoom(JSON.parse(readFileSync(roomPath, 'utf8')))
}

function expectExactGraph(
  room: RoomDefinition,
  expectedNodes: Record<string, readonly string[]>,
  expectedPanels: Record<string, ExpectedPanel>,
) {
  expect(room.nodes).toEqual(
    Object.fromEntries(
      Object.entries(expectedNodes).map(([nodeId, candidates]) => [
        nodeId,
        { candidates },
      ]),
    ),
  )

  const candidateIds = Object.values(room.nodes).flatMap(
    (node) => node.candidates,
  )
  expect(candidateIds).toHaveLength(24)
  expect(new Set(candidateIds).size).toBe(24)
  expect(Object.keys(room.panels).sort()).toEqual([...candidateIds].sort())

  for (const [panelId, expected] of Object.entries(expectedPanels)) {
    const panel = room.panels[panelId] as PanelDefinition
    expect(
      {
        next: panel.next,
        effects: panel.effects ?? {},
        setFlags: panel.setFlags ?? [],
      },
      panelId,
    ).toEqual({
      next: expected.next,
      effects: expected.effects ?? {},
      setFlags: expected.setFlags ?? [],
    })
  }
}

function walkAllRoutes(
  room: RoomDefinition,
  inheritedFlags: Record<string, boolean> = {},
): Route[] {
  const routes: Route[] = []

  const visit = (choices: string[]) => {
    const engine = new StoryEngine(room, inheritedFlags)
    for (const panelId of choices) engine.choose(panelId)

    if (engine.atEndingAnchor()) {
      routes.push({
        choices,
        ending: resolveEnding(
          room.endingRules,
          engine.snapshot.stats,
          engine.snapshot.flags,
        ),
      })
      return
    }

    expect(choices.length, `unterminated route: ${choices.join(' > ')}`)
      .toBeLessThan(6)
    for (const candidate of engine.getCandidates()) {
      visit([...choices, candidate.id])
    }
  }

  visit([])
  return routes
}

describe('exact room graphs', () => {
  test('room A matches the authored node and effect contract', () => {
    const room = loadRoom('room_a_blackout')

    expect(room.startNode).toBe('a1')
    expect(room.endingRules).toEqual(roomAEndingRules)
    expectExactGraph(room, roomANodes, roomAPanels)
  })

  test('room B matches the authored node and effect contract', () => {
    const room = loadRoom('room_b_wall')

    expect(room.startNode).toBe('b1')
    expect(room.endingRules).toEqual(roomBEndingRules)
    expectExactGraph(room, roomBNodes, roomBPanels)
  })

  test('all 48 production panels contain authored Traditional Chinese dialogue', () => {
    const panels = [
      ...Object.values(loadRoom('room_a_blackout').panels),
      ...Object.values(loadRoom('room_b_wall').panels),
    ]

    expect(panels).toHaveLength(48)
    for (const panel of panels) {
      const dialogue = panel.dialogue ?? []
      expect(dialogue.length).toBeGreaterThan(0)
      expect(dialogue.every((line) => line.trim().length > 0))
        .toBe(true)
      expect(dialogue.join('')).toMatch(
        /[\u3400-\u4dbf\u4e00-\u9fff]/,
      )
    }
  })

  test('Room B glass has visibly different inherited-clue dialogue', () => {
    const panel = loadRoom('room_b_wall').panels.b1_glass!

    expect(panel.dialogueVariants?.cross_room).toBeDefined()
    expect(panel.dialogueVariants?.cross_room).not.toEqual(
      panel.dialogue,
    )
  })
})

describe('all routes', () => {
  test.each([
    ['room A', 'room_a_blackout', {}],
    ['room B default', 'room_b_wall', {}],
    ['room B inherited clue', 'room_b_wall', { a_hidden_circuit: true }],
  ])('%s has 729 six-choice routes and all endings', (_name, roomId, flags) => {
    const routes = walkAllRoutes(loadRoom(roomId), flags)

    expect(routes).toHaveLength(729)
    expect(new Set(routes.map((route) => route.choices.length))).toEqual(
      new Set([6]),
    )
    expect(new Set(routes.map((route) => route.ending))).toEqual(
      new Set(['main', 'normal', 'intimacy']),
    )
  })

  test('Room B keeps every candidate route when the inherited clue is set', () => {
    const room = loadRoom('room_b_wall')
    const defaultRoutes = walkAllRoutes(room).map((route) =>
      route.choices.join(' > '),
    )
    const inheritedRoutes = walkAllRoutes(room, {
      a_hidden_circuit: true,
    }).map((route) => route.choices.join(' > '))

    expect(inheritedRoutes).toEqual(defaultRoutes)
  })

  test('Room B keeps the same first three candidate ids with the inherited clue', () => {
    const room = loadRoom('room_b_wall')
    const defaultIds = new StoryEngine(room)
      .getCandidates()
      .map(({ id }) => id)
    const inheritedIds = new StoryEngine(room, {
      a_hidden_circuit: true,
    }).getCandidates().map(({ id }) => id)

    expect(defaultIds).toEqual([
      'b1_glass',
      'b1_knock',
      'b1_neighbor',
    ])
    expect(inheritedIds).toEqual(defaultIds)
  })
})

test('content validation CLI reports both complete rooms', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', validationScript],
    {
      cwd: prototypeDirectory,
      encoding: 'utf8',
    },
  )

  expect(result.stderr).toBe('')
  expect(result.status).toBe(0)
  expect(result.stdout.trim().split(/\r?\n/)).toEqual([
    'room_a_blackout: valid, 24 authored cards, 12-card deals, 3 endings',
    'room_b_wall: valid, 24 authored cards, 12-card deals, 3 endings',
  ])
})
