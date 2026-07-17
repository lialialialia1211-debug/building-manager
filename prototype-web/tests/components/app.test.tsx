import { afterEach, beforeEach } from 'vitest'
import {
  act,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/app/App'
import { useAppStore } from '@/app/store'
import { createEmptyProgress } from '@/domain/progress'
import {
  StoryEngine,
  type StorySnapshot,
} from '@/domain/story-engine'
import type { RoomDefinition } from '@/domain/types'

const emptyEnding = {
  title: 'Fixture ending',
  asset: 'ending-fixture',
  clueIds: [],
  galleryUnlocks: [],
}

const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: {
    n1: {
      candidates: ['a1_door', 'a1_fuse', 'a1_note'],
    },
  },
  panels: {
    a1_door: {
      next: 'ending',
      previewAsset: 'a1_door',
      actionLabel: '查看門口',
      dialogue: ['門外傳來敲門聲。'],
    },
    a1_fuse: {
      next: 'ending',
      previewAsset: 'a1_fuse',
      actionLabel: '檢查桌面',
      dialogue: ['桌面上的工具仍帶著餘溫。'],
    },
    a1_note: {
      next: 'ending',
      previewAsset: 'a1_note',
      actionLabel: '留在原地',
      dialogue: ['房間在黑暗中保持安靜。'],
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

const defaultRetryError = useAppStore.getState().retryError

beforeEach(() => {
  useAppStore.setState({
    screen: 'building',
    selectedRoomId: null,
    progress: createEmptyProgress(),
    engine: null,
    settledResult: null,
    choiceLocked: false,
    revealedPanelId: null,
    error: null,
    retryError: defaultRetryError,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('starts on the building map', () => {
  render(<App />)

  expect(screen.getByTestId('building-screen')).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: '大樓管理員' }),
  ).toBeInTheDocument()
})

test('shows an actionable application error and invokes its retry', async () => {
  const user = userEvent.setup()
  const retryError = vi.fn()
  useAppStore.setState({
    error: {
      message: '無法保存這次選擇。',
      actionLabel: '重新保存選擇',
    },
    retryError,
  })

  render(<App />)

  expect(screen.getByRole('alert')).toHaveTextContent(
    '無法保存這次選擇。',
  )
  await user.click(screen.getByRole('button', {
    name: '重新保存選擇',
  }))
  expect(retryError).toHaveBeenCalledOnce()
})

test('stores the selected room and loads its briefing', async () => {
  const user = userEvent.setup()
  type FetchResult = {
    ok: boolean
    json(): Promise<unknown>
  }
  let resolveRoom!: (result: FetchResult) => void
  let resolveCharacters!: (result: FetchResult) => void
  const roomResponse = new Promise<FetchResult>((resolve) => {
    resolveRoom = resolve
  })
  const characterResponse = new Promise<FetchResult>((resolve) => {
    resolveCharacters = resolve
  })
  vi.stubGlobal('fetch', vi.fn((input: string) =>
    input === '/characters.json'
      ? characterResponse
      : roomResponse,
  ))
  render(<App />)

  await user.click(
    screen.getByRole('button', { name: /停電之夜/ }),
  )

  expect(useAppStore.getState()).toMatchObject({
    selectedRoomId: 'room_a_blackout',
    screen: 'roomBrief',
  })
  expect(screen.getByTestId('app-loading')).toBeInTheDocument()

  resolveRoom({
    ok: true,
    json: async () => room,
  })
  resolveCharacters({
    ok: true,
    json: async () => [
      {
        id: 'lin_yuwei',
        displayName: '林雨薇',
        age: 28,
        ageStatus: 'adult',
        roomId: room.id,
      },
      {
        id: 'chen_haoran',
        displayName: '陳皓然',
        age: 31,
        ageStatus: 'adult',
        roomId: room.id,
      },
    ],
  })

  expect(
    await screen.findByTestId('room-brief-screen'),
  ).toBeInTheDocument()
})

test('automatically resumes a saved current run on the comic screen', async () => {
  const progress = createEmptyProgress()
  const snapshot: StorySnapshot = {
    roomId: room.id,
    currentNode: 'ending',
    choiceCount: 1,
    chosenPanels: ['a1_door'],
    stats: { affection: 0, trust: 0, intimacy: 0 },
    flags: {},
  }
  progress.currentRun = {
    roomId: room.id,
    lockedPanelId: 'a1_door',
    snapshot,
  }
  useAppStore.setState({
    screen: 'building',
    selectedRoomId: null,
    progress,
    engine: null,
    choiceLocked: false,
    revealedPanelId: null,
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => room,
  })))

  render(<App />)

  expect(await screen.findByTestId('panel-motion')).toHaveStyle({
    '--reveal-duration': '2200ms',
  })
  expect(useAppStore.getState()).toMatchObject({
    screen: 'comic',
    selectedRoomId: room.id,
    choiceLocked: true,
    revealedPanelId: 'a1_door',
  })
})

test('shows a resume load error, preserves the run, and retries successfully', async () => {
  const progress = createEmptyProgress()
  const savedEngine = new StoryEngine(room)
  savedEngine.choose('a1_door')
  progress.currentRun = {
    roomId: room.id,
    lockedPanelId: 'a1_door',
    snapshot: structuredClone(savedEngine.snapshot),
  }
  useAppStore.setState({
    screen: 'building',
    progress,
    engine: null,
  })
  let shouldFail = true
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (shouldFail) throw new Error('temporary network failure')
    return {
      ok: true,
      json: async () => room,
    }
  }))
  const user = userEvent.setup()

  render(<App />)

  expect(await screen.findByRole('alert')).toHaveTextContent(
    '房間載入失敗',
  )
  expect(useAppStore.getState().progress.currentRun).toMatchObject({
    roomId: room.id,
    lockedPanelId: 'a1_door',
  })

  shouldFail = false
  await user.click(screen.getByRole('button', {
    name: '重試載入',
  }))

  expect(await screen.findByTestId('panel-motion')).toBeInTheDocument()
  expect(useAppStore.getState().error).toBeNull()
})

test('uses the formal result route after an ending settles', () => {
  const engine = new StoryEngine(room)
  engine.choose('a1_door')
  useAppStore.setState({
    screen: 'result',
    selectedRoomId: room.id,
    progress: createEmptyProgress(),
    engine,
    choiceLocked: false,
    revealedPanelId: null,
    settledResult: {
      roomId: room.id,
      endingId: 'intimacy',
      newClues: [],
      newGalleryUnlocks: [],
    },
  })

  render(<App />)

  expect(
    screen.getByRole('heading', { name: 'Fixture ending' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: '重新遊玩' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: '返回大樓' }),
  ).toBeInTheDocument()
})

test('uses the formal gallery and settings routes', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => [
      {
        id: 'room_a_main',
        roomId: room.id,
        endingId: 'main',
        adult: false,
      },
      {
        id: 'room_a_normal',
        roomId: room.id,
        endingId: 'normal',
        adult: false,
      },
      {
        id: 'room_a_intimacy',
        roomId: room.id,
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
    ],
  })))
  const progress = createEmptyProgress()
  progress.galleryUnlocks = ['room_a_main']
  useAppStore.setState({
    screen: 'gallery',
    progress,
  })
  const { rerender } = render(<App />)

  expect(
    await screen.findByRole('button', {
      name: '停電之夜：主線結局',
    }),
  ).toBeEnabled()

  act(() => {
    useAppStore.setState({ screen: 'settings' })
  })
  rerender(<App />)

  expect(
    screen.getByRole('checkbox', { name: '成人內容' }),
  ).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: '顯示精確數值' }),
  ).not.toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: '自動快轉已讀內容' }),
  ).toBeChecked()
})
