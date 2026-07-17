import { afterEach, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/app/store'
import { DraftStoryEngine } from '@/domain/draft-story-engine'
import { createEmptyProgress } from '@/domain/progress'
import type { PanelDefinition, RoomDefinition } from '@/domain/types'
import { ComicScreen } from '@/screens/ComicScreen'

const approvedPanelIds = [
  'a1_door',
  'a1_fuse',
  'a1_note',
  'a2d_open',
  'a2d_chain',
  'a2d_listen',
  'a2f_reset',
  'a2f_tools',
  'a2f_call',
  'a2n_follow',
  'a2n_photo',
  'a2n_wait',
  'a3_trace',
  'a3_share',
  'a3_candle',
  'a4_ground',
  'a4_comfort',
  'a4_sleep',
  'a5_photo',
  'a5_ask',
  'a5_ignore',
  'a6_report',
  'a6_consent',
  'a6_morning',
] as const

function createRoom(): RoomDefinition {
  const panels = Object.fromEntries(
    approvedPanelIds.map((id, index) => {
      const panel: PanelDefinition = {
        next: 'ending',
        previewAsset: id,
        actionLabel: `行動 ${index + 1}`,
        dialogue: [`第 ${index + 1} 張卡的隱藏完整對白。`],
        effects: { trust: 1 },
      }
      return [id, panel]
    }),
  )

  return {
    schemaVersion: 1,
    id: 'room_a_blackout',
    title: '編排測試',
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
      requiredDealPanels: [...approvedPanelIds.slice(0, 6)],
    },
    openingDialogue: ['固定開場說明。'],
    endingRules: [
      {
        id: 'intimacy',
        priority: 300,
        conditions: { allFlags: ['consent'] },
      },
      { id: 'main', priority: 200, conditions: { minimumStats: { trust: 6 } } },
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

const room = createRoom()

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({
    screen: 'comic',
    selectedRoomId: room.id,
    progress: createEmptyProgress(),
    engine: new DraftStoryEngine(room, {}, undefined, 'ui-seed'),
    choiceLocked: false,
    revealedPanelId: null,
    settledResult: null,
    error: null,
  })
})

afterEach(() => {
  useAppStore.setState({
    screen: 'building',
    selectedRoomId: null,
    progress: createEmptyProgress(),
    engine: null,
    choiceLocked: false,
    revealedPanelId: null,
    settledResult: null,
    error: null,
  })
})

test('shows twelve random cards, six slots, and a disabled confirm action', () => {
  render(<ComicScreen roomId={room.id} />)

  expect(screen.getAllByRole('button', {
    name: /^加入編排：/,
  })).toHaveLength(12)
  expect(screen.getAllByTestId('comic-choice-slot')).toHaveLength(6)
  expect(screen.getByText('已編排 0 / 6')).toBeInTheDocument()
  expect(screen.getByRole('button', {
    name: '確認編排並揭曉',
  })).toBeDisabled()
})

test('keeps full dialogue hidden until all six cards are confirmed', async () => {
  const user = userEvent.setup()
  render(<ComicScreen roomId={room.id} />)
  const candidates = screen.getAllByRole('button', {
    name: /^加入編排：/,
  })
  const firstLabel = candidates[0]!.getAttribute('aria-label')!
  const firstActionNumber = firstLabel.match(/\d+/)?.[0]

  for (const candidate of candidates.slice(0, 6)) {
    await user.click(candidate)
  }

  expect(screen.getByText('已編排 6 / 6')).toBeInTheDocument()
  expect(screen.queryByText(
    `第 ${firstActionNumber} 張卡的隱藏完整對白。`,
  )).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', {
    name: '確認編排並揭曉',
  }))

  expect(screen.queryAllByRole('button', {
    name: /^加入編排：/,
  })).toHaveLength(0)
  expect(screen.getByText('揭曉 1 / 6')).toBeInTheDocument()
  expect(screen.getByRole('status', {
    name: '分鏡揭曉',
  })).toHaveTextContent(
    `第 ${firstActionNumber} 張卡的隱藏完整對白。`,
  )
})

test('supports removing and keyboard-friendly left-right reordering', async () => {
  const user = userEvent.setup()
  render(<ComicScreen roomId={room.id} />)
  const candidates = screen.getAllByRole('button', {
    name: /^加入編排：/,
  })
  await user.click(candidates[0]!)
  await user.click(candidates[1]!)

  const engineBefore = useAppStore.getState()
    .engine as DraftStoryEngine
  const [first, second] = engineBefore.snapshot.slots

  await user.click(screen.getByRole('button', {
    name: '第 2 格向左移',
  }))
  expect(
    (useAppStore.getState().engine as DraftStoryEngine)
      .snapshot.slots.slice(0, 2),
  ).toEqual([second, first])

  await user.click(screen.getByRole('button', {
    name: '移除第 1 格',
  }))
  expect(
    (useAppStore.getState().engine as DraftStoryEngine)
      .snapshot.slots.slice(0, 2),
  ).toEqual([null, first])
})

test('supports dragging a placed slot onto another slot to swap them', async () => {
  const user = userEvent.setup()
  const { container } = render(<ComicScreen roomId={room.id} />)
  const candidates = screen.getAllByRole('button', {
    name: /^加入編排：/,
  })
  await user.click(candidates[0]!)
  await user.click(candidates[1]!)
  const before = [
    ...(useAppStore.getState().engine as DraftStoryEngine)
      .snapshot.slots,
  ]
  const values = new Map<string, string>()
  const dataTransfer = {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData(type: string, value: string) {
      values.set(type, value)
    },
    getData(type: string) {
      return values.get(type) ?? ''
    },
  }
  const slotOne = container.querySelector(
    '[data-slot-index="1"]',
  )!
  const slotZero = container.querySelector(
    '[data-slot-index="0"]',
  )!

  fireEvent.dragStart(slotOne, { dataTransfer })
  fireEvent.dragOver(slotZero, { dataTransfer })
  fireEvent.drop(slotZero, { dataTransfer })

  expect(
    (useAppStore.getState().engine as DraftStoryEngine)
      .snapshot.slots.slice(0, 2),
  ).toEqual([before[1], before[0]])
})
