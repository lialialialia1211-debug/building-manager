import { afterEach, beforeEach } from 'vitest'
import {
  act,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRuntimeAssets as useRuntimeAssetsHook } from '@/hooks/use-runtime-assets'
import { App } from '@/app/App'
import { useAppStore } from '@/app/store'
import { createEmptyProgress } from '@/domain/progress'
import {
  StoryEngine,
  type StorySnapshot,
} from '@/domain/story-engine'
import type { RoomDefinition } from '@/domain/types'

vi.mock('@/hooks/use-runtime-assets', () => ({
  useRuntimeAssets: vi.fn(),
}))

const catalog = {
  common: {
    a_open_01: {
      preview: '/art/a-open-01-preview.webp',
      full: '/art/a-open-01-full.webp',
    },
    a_open_02: {
      preview: '/art/a-open-02-preview.webp',
      full: '/art/a-open-02-full.webp',
    },
    a_open_03: {
      preview: '/art/a-open-03-preview.webp',
      full: '/art/a-open-03-full.webp',
    },
    'ending-fixture': {
      preview: '/art/ending-fixture-preview.webp',
      full: '/art/ending-fixture-full.webp',
    },
    ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
      const id = `a_safe_0${index + 1}`
      return [id, {
        preview: `/art/${id}-preview.webp`,
        full: `/art/${id}-full.webp`,
      }]
    })),
  },
  adult: null,
  backgrounds: {
    building_a: '/art/building-a.webp',
    building_b: '/art/building-b.webp',
  },
}

const useRuntimeAssets = vi.mocked(useRuntimeAssetsHook)

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
  backgroundAsset: 'building_a',
  openingAssets: ['a_open_01', 'a_open_02', 'a_open_03'],
  openingDialogue: ['第一段開場', '第二段開場', '第三段開場'],
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
  useRuntimeAssets.mockReturnValue({
    catalog,
    commonStatus: 'ready',
    adultStatus: 'disabled',
    retryCommon: vi.fn(),
    retryAdult: vi.fn(),
  })
  useAppStore.setState({
    screen: 'building',
    selectedRoomId: null,
    progress: createEmptyProgress(),
    engine: null,
    settledResult: null,
    choiceLocked: false,
    revealedPanelId: null,
    openingPending: false,
    error: null,
    retryError: defaultRetryError,
  })
})

test('fresh app keeps adult assets disabled and shows an unchecked setting', () => {
  render(<App />)

  expect(useRuntimeAssets).toHaveBeenCalledWith(false)
  act(() => {
    useAppStore.setState({ screen: 'settings' })
  })
  expect(screen.getByRole('checkbox', { name: '成人內容' }))
    .not.toBeChecked()
})

test('blocks the app while common art loads and offers a retry on failure', async () => {
  const user = userEvent.setup()
  const retryCommon = vi.fn()
  useRuntimeAssets.mockReturnValue({
    catalog: null,
    commonStatus: 'loading',
    adultStatus: 'disabled',
    retryCommon,
    retryAdult: vi.fn(),
  })
  const { rerender } = render(<App />)

  expect(screen.getByLabelText('載入美術資源')).toHaveTextContent('載入中')
  expect(screen.queryByTestId('building-screen')).not.toBeInTheDocument()

  useRuntimeAssets.mockReturnValue({
    catalog: null,
    commonStatus: 'error',
    adultStatus: 'disabled',
    retryCommon,
    retryAdult: vi.fn(),
  })
  rerender(<App />)

  expect(screen.getByRole('alert')).toHaveTextContent('美術資源載入失敗')
  await user.click(screen.getByRole('button', { name: '重新載入美術' }))
  expect(retryCommon).toHaveBeenCalledOnce()
})

test('keeps safe gameplay available when adult art fails', () => {
  useRuntimeAssets.mockReturnValue({
    catalog,
    commonStatus: 'ready',
    adultStatus: 'error',
    retryCommon: vi.fn(),
    retryAdult: vi.fn(),
  })

  render(<App />)

  expect(screen.getByRole('status')).toHaveTextContent(
    '成人美術暫時無法載入，已改用安全版',
  )
  expect(screen.getByTestId('building-screen')).toBeInTheDocument()
})

test('shows the opening before comic cards and continues after skip', async () => {
  const user = userEvent.setup()
  useAppStore.setState({
    screen: 'comic',
    selectedRoomId: room.id,
    engine: new StoryEngine(room),
    openingPending: true,
  })

  render(<App />)

  expect(screen.getByText('1 / 3')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '停電之夜開場 1' }))
    .toHaveAttribute('src', '/art/a-open-01-full.webp')
  expect(screen.queryByRole('button', { name: /查看門口/ }))
    .not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '跳過開場' }))

  expect(useAppStore.getState().openingPending).toBe(false)
  expect(screen.getByRole('button', { name: /查看門口/ }))
    .toBeInTheDocument()
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

test('loads the authored gallery entry for the formal result route', async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => [
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
        adultSequence: Array.from(
          { length: 6 },
          (_, index) => `a_intimacy_0${index + 1}`,
        ),
        safeSequence: Array.from(
          { length: 6 },
          (_, index) => `a_safe_0${index + 1}`,
        ),
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
        adultSequence: Array.from(
          { length: 6 },
          (_, index) => `b_intimacy_0${index + 1}`,
        ),
        safeSequence: Array.from(
          { length: 6 },
          (_, index) => `b_safe_0${index + 1}`,
        ),
      },
    ],
  }))
  vi.stubGlobal('fetch', fetchMock)
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
  await waitFor(() => {
    expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
      'data-asset-id',
      'a_safe_01',
    )
  })
  expect(fetchMock).toHaveBeenCalledWith('/gallery.json')
})

test('keeps result controls available when authored gallery loading fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('gallery unavailable')
  }))
  const engine = new StoryEngine(room)
  engine.choose('a1_door')
  const progress = createEmptyProgress()
  progress.settings.exactStats = true
  useAppStore.setState({
    screen: 'result',
    selectedRoomId: room.id,
    progress,
    engine,
    settledResult: {
      roomId: room.id,
      endingId: 'intimacy',
      newClues: [],
      newGalleryUnlocks: [],
    },
  })

  render(<App />)

  expect(await screen.findByText(/回想資料載入失敗/)).toBeInTheDocument()
  expect(screen.getByTestId('exact-stat-trust')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '重新遊玩' })).toBeEnabled()
  expect(screen.getByRole('button', { name: '返回大樓' })).toBeEnabled()
  expect(screen.getByTestId('result-screen').innerHTML)
    .not.toContain('/adult/')
})

test('uses the formal gallery and settings routes', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => ({
    ok: true,
    json: async () => input.includes('/rooms/')
      ? {
          ...room,
          id: input.includes('room_b_wall')
            ? 'room_b_wall'
            : room.id,
        }
      : [
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
  ).not.toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: '顯示精確數值' }),
  ).not.toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: '自動快轉已讀內容' }),
  ).toBeChecked()
})
