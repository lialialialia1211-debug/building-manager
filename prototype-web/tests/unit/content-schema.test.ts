import { describe, expect, test } from 'vitest'
import * as schemaModule from '@/domain/content-schema'
import { parseRoom } from '@/domain/content-schema'
import type { PanelDefinition } from '@/domain/types'

type DialogueIsRequired =
  {} extends Pick<PanelDefinition, 'dialogue'> ? false : true
const dialogueIsRequired: DialogueIsRequired = true

const emptyEnding = {
  title: 'Fixture ending',
  asset: 'ending-fixture',
  clueIds: [],
  galleryUnlocks: [],
}

const baseRoom = {
  schemaVersion: 1,
  id: 'fixture',
  title: 'Fixture',
  startNode: 'n1',
  safeNode: 'n5',
  endingAnchor: 'ending',
  nodes: { n1: { candidates: ['p1', 'p2', 'p3'] } },
  panels: {
    p1: {
      next: 'ending',
      previewAsset: 'p1',
      actionLabel: '查看門口',
      dialogue: ['門外傳來一聲短促的敲門聲。'],
    },
    p2: {
      next: 'ending',
      previewAsset: 'p2',
      actionLabel: '檢查桌面',
      dialogue: ['桌上的紙張被夜風吹得輕輕翻動。'],
    },
    p3: {
      next: 'ending',
      previewAsset: 'p3',
      actionLabel: '留在原地',
      dialogue: ['房內只剩下遠處設備運轉的低鳴。'],
    },
  },
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

function draftingRoom() {
  const room = structuredClone(baseRoom) as Record<string, any>
  room.backgroundAsset = 'bg_room_a'
  room.openingAssets = ['a_open_01', 'a_open_02', 'a_open_03']
  room.drafting = {
    dealSize: 12 as const,
    selectionSize: 6 as const,
    requiredDealPanels: ['p1'],
  }
  room.openingDialogue = [
    '停電後的房間被異常漫畫頁捕捉。'.repeat(45),
  ]
  room.panels = Object.fromEntries(
    Array.from({ length: 24 }, (_, index) => {
      const id = `p${index + 1}`
      return [
        id,
        {
          next: 'ending',
          previewAsset: id,
          actionLabel: `觀察行動 ${index + 1}`,
          artBrief: `以成年角色、關鍵道具與光線差異呈現第 ${index + 1} 張候選卡的明確行動，保留人物臉部、雙手與道具輪廓，並維持房間空間方向及夜間色調連續。`,
          dialogue: [
            `第 ${index + 1} 張卡必須提供完整事件、人物反應、推理資訊與下一段情緒餘韻。`.repeat(12),
          ],
        },
      ]
    }),
  )
  for (const ending of Object.values(
    room.endingContent,
  ) as Array<Record<string, any>>) {
    ending.dialogue = [
      '事件在固定結尾錨點完整收束，角色回看今晚的選擇並說明它留下的關係與謎團影響。'.repeat(10),
    ]
    ending.artBrief =
      '固定結尾必須清楚呈現兩名成年角色、房間狀態、核心證據與該結局的情緒距離，並保留後續回想所需的構圖連續性；畫面還要交代夜晚結束後的光線、人物站位、關鍵道具位置與共同謎團留下的視覺餘韻。'
  }
  return room
}

describe('content schema', () => {
  test('requires dialogue in the TypeScript panel contract', () => {
    expect(dialogueIsRequired).toBe(true)
  })

  test('accepts exactly three candidates', () => {
    expect(parseRoom(baseRoom).id).toBe('fixture')
  })

  test('rejects two candidates', () => {
    const invalid = structuredClone(baseRoom)
    invalid.nodes.n1.candidates = ['p1', 'p2']

    expect(() => parseRoom(invalid)).toThrow('exactly 3 candidates')
  })

  test('preserves the canonical neutral action label', () => {
    expect(parseRoom(baseRoom).panels.p1!.actionLabel).toBe('查看門口')
  })

  test('rejects a panel without an action label', () => {
    const invalid = structuredClone(baseRoom)
    delete (invalid.panels.p1 as { actionLabel?: string }).actionLabel

    expect(() => parseRoom(invalid)).toThrow()
  })

  test('requires at least one non-empty authored dialogue line', () => {
    const missing = structuredClone(baseRoom)
    delete (missing.panels.p1 as { dialogue?: string[] }).dialogue
    const blank = structuredClone(baseRoom)
    blank.panels.p1.dialogue = ['   ']

    expect(() => parseRoom(missing)).toThrow()
    expect(() => parseRoom(blank)).toThrow()
  })

  test('preserves explicit non-empty dialogue variants', () => {
    const variant = structuredClone(baseRoom)
    ;(variant.panels.p1 as {
      dialogueVariants?: Record<string, string[]>
    }).dialogueVariants = {
      cross_room: ['牆內的電流聲和停電房的迴路節奏一致。'],
    }

    expect(
      parseRoom(variant).panels.p1!.dialogueVariants?.cross_room,
    ).toEqual(['牆內的電流聲和停電房的迴路節奏一致。'])
  })

  test('accepts the twelve-card drafting contract with art-ready text', () => {
    const parsed = parseRoom(draftingRoom())

    expect(parsed.drafting).toEqual({
      dealSize: 12,
      selectionSize: 6,
      requiredDealPanels: ['p1'],
    })
    expect(parsed.openingDialogue?.join('').length)
      .toBeGreaterThanOrEqual(600)
  })

  test('rejects drafting cards without an art brief or enough story text', () => {
    const missingBrief = draftingRoom()
    delete (missingBrief.panels.p1 as {
      artBrief?: string
    }).artBrief
    const shortDialogue = draftingRoom()
    shortDialogue.panels.p2!.dialogue = ['太短。']

    expect(() => parseRoom(missingBrief)).toThrow('artBrief')
    expect(() => parseRoom(shortDialogue)).toThrow(
      'at least 260 characters',
    )
  })
})

describe('gallery schema', () => {
  const validGallery = [
    {
      id: 'room_a_main',
      roomId: 'room_a_blackout',
      endingId: 'main',
      adult: false,
    },
    {
      id: 'room_a_normal',
      roomId: 'room_a_blackout',
      endingId: 'normal',
      adult: false,
    },
    {
      id: 'room_a_intimacy',
      roomId: 'room_a_blackout',
      endingId: 'intimacy',
      adult: true,
      adultSequence: [
        'a_intimacy_01',
        'a_intimacy_02',
        'a_intimacy_03',
        'a_intimacy_04',
        'a_intimacy_05',
        'a_intimacy_06',
      ],
      safeSequence: [
        'a_safe_01',
        'a_safe_02',
        'a_safe_03',
        'a_safe_04',
        'a_safe_05',
        'a_safe_06',
      ],
    },
    {
      id: 'room_b_main',
      roomId: 'room_b_wall',
      endingId: 'main',
      adult: false,
    },
    {
      id: 'room_b_normal',
      roomId: 'room_b_wall',
      endingId: 'normal',
      adult: false,
    },
    {
      id: 'room_b_intimacy',
      roomId: 'room_b_wall',
      endingId: 'intimacy',
      adult: true,
      adultSequence: [
        'b_intimacy_01',
        'b_intimacy_02',
        'b_intimacy_03',
        'b_intimacy_04',
        'b_intimacy_05',
        'b_intimacy_06',
      ],
      safeSequence: [
        'b_safe_01',
        'b_safe_02',
        'b_safe_03',
        'b_safe_04',
        'b_safe_05',
        'b_safe_06',
      ],
    },
  ]

  function parseGallery(value: unknown) {
    const parser = (
      schemaModule as unknown as {
        parseGallery(value: unknown): unknown
      }
    ).parseGallery
    expect(parser).toBeTypeOf('function')
    return parser(value)
  }

  test('accepts all six supported room and ending combinations', () => {
    expect(parseGallery(validGallery)).toEqual(validGallery)
  })

  test('rejects a missing supported combination', () => {
    expect(() => parseGallery(validGallery.slice(0, -1))).toThrow()
  })

  test('rejects adult entries with empty or misaligned sequences', () => {
    const empty = structuredClone(validGallery)
    empty[2]!.adultSequence = []
    const misaligned = structuredClone(validGallery)
    misaligned[2]!.safeSequence = ['a_safe_01', 'a_safe_02']

    expect(() => parseGallery(empty)).toThrow()
    expect(() => parseGallery(misaligned)).toThrow()
  })

  test('rejects a noncanonical gallery id for a supported ending', () => {
    const invalid = structuredClone(validGallery)
    invalid[0]!.id = 'unrelated_unlock'

    expect(() => parseGallery(invalid)).toThrow()
  })

  test('rejects intimacy entries marked non-adult without sequences', () => {
    const invalid = structuredClone(validGallery)
    invalid[2] = {
      id: 'room_a_intimacy',
      roomId: 'room_a_blackout',
      endingId: 'intimacy',
      adult: false,
    }

    expect(() => parseGallery(invalid)).toThrow()
  })

  test('rejects main entries marked adult with adult and safe sequences', () => {
    const invalid = structuredClone(validGallery)
    invalid[0] = {
      id: 'room_a_main',
      roomId: 'room_a_blackout',
      endingId: 'main',
      adult: true,
      adultSequence: [
        'a_intimacy_01',
        'a_intimacy_02',
        'a_intimacy_03',
        'a_intimacy_04',
        'a_intimacy_05',
        'a_intimacy_06',
      ],
      safeSequence: [
        'a_safe_01',
        'a_safe_02',
        'a_safe_03',
        'a_safe_04',
        'a_safe_05',
        'a_safe_06',
      ],
    }

    expect(() => parseGallery(invalid)).toThrow()
  })

  test('rejects sequences on a non-adult main entry', () => {
    const invalid = structuredClone(validGallery)
    invalid[0]!.adultSequence = [
      'a_intimacy_01',
      'a_intimacy_02',
      'a_intimacy_03',
      'a_intimacy_04',
      'a_intimacy_05',
      'a_intimacy_06',
    ]
    invalid[0]!.safeSequence = [
      'a_safe_01',
      'a_safe_02',
      'a_safe_03',
      'a_safe_04',
      'a_safe_05',
      'a_safe_06',
    ]

    expect(() => parseGallery(invalid)).toThrow()
  })
})
