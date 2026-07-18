import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyProgress } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type {
  EndingId,
  GalleryEntry,
  RoomDefinition,
} from '@/domain/types'
import { ResultScreen } from '@/screens/ResultScreen'

function createRoom(prefix: 'a' | 'b'): RoomDefinition {
  const roomId = prefix === 'a' ? 'room_a_blackout' : 'room_b_wall'
  const title = prefix === 'a' ? '停電之夜' : '牆後的聲音'
  const panels = Object.fromEntries(Array.from(
    { length: 6 },
    (_, index) => {
      const id = `${prefix}${index + 1}`
      return [id, {
        next: 'ending',
        previewAsset: id,
        dialogue: ['Fixture dialogue'],
        actionLabel: id,
      }]
    },
  ))
  const ending = (endingId: EndingId) => ({
    title: `${title}${endingId}`,
    asset: `${prefix}_ending_${endingId}`,
    dialogue: endingId === 'main' ? ['結局故事段落'] : undefined,
    clueIds: [] as string[],
    galleryUnlocks: [] as string[],
  })

  return {
    schemaVersion: 1,
    id: roomId,
    title,
    backgroundAsset: `building_${prefix}`,
    openingAssets: [
      `${prefix}_open_01`,
      `${prefix}_open_02`,
      `${prefix}_open_03`,
    ],
    startNode: 'n1',
    safeNode: 'n1',
    endingAnchor: 'ending',
    nodes: { n1: { candidates: [`${prefix}1`, `${prefix}2`, `${prefix}3`] } },
    panels,
    endingRules: [],
    endingContent: {
      main: ending('main'),
      normal: ending('normal'),
      intimacy: ending('intimacy'),
    },
  }
}

const roomA = createRoom('a')
const roomB = createRoom('b')
const rooms = [roomA, roomB]
const commonIds = rooms.flatMap((room) => [
  ...room.openingAssets,
  ...Object.keys(room.panels),
  ...Object.values(room.endingContent).map((ending) => ending.asset),
  ...Array.from({ length: 6 }, (_, index) => (
    `${room.id === 'room_a_blackout' ? 'a' : 'b'}_safe_0${index + 1}`
  )),
])
const adultIds = rooms.flatMap((room) => Array.from(
  { length: 6 },
  (_, index) => (
    `${room.id === 'room_a_blackout' ? 'a' : 'b'}_intimacy_0${index + 1}`
  ),
))
const customAdultIds = Array.from(
  { length: 6 },
  (_, index) => `a_intimacy_aftercare_0${index + 1}`,
)
const customSafeIds = Array.from(
  { length: 6 },
  (_, index) => `a_safe_aftercare_0${index + 1}`,
)
const catalog: AssetCatalog = {
  common: Object.fromEntries([...commonIds, ...customSafeIds].map((id) => [id, {
    preview: `/common/${id}.webp`,
    full: `/common/${id}.webp`,
  }])),
  adult: Object.fromEntries([...adultIds, ...customAdultIds].map((id) => [id, {
    preview: `/adult/${id}.webp`,
    full: `/adult/${id}.webp`,
  }])),
  backgrounds: {},
}

function intimacyEntry(room: RoomDefinition): GalleryEntry {
  const prefix = room.id === 'room_a_blackout' ? 'a' : 'b'
  return {
    id: `room_${prefix}_intimacy`,
    roomId: room.id,
    endingId: 'intimacy',
    adult: true,
    adultSequence: Array.from(
      { length: 6 },
      (_, index) => `${prefix}_intimacy_0${index + 1}`,
    ),
    safeSequence: Array.from(
      { length: 6 },
      (_, index) => `${prefix}_safe_0${index + 1}`,
    ),
  }
}

function renderResult(
  room: RoomDefinition,
  endingId: EndingId,
  progress = createEmptyProgress(),
  adultStatus: 'disabled' | 'loading' | 'ready' | 'error' = 'ready',
) {
  return render(
    <ResultScreen
      room={room}
      result={{
        roomId: room.id,
        endingId,
        newClues: [],
        newGalleryUnlocks: [],
      }}
      stats={{ affection: 2, trust: 4, intimacy: 3 }}
      progress={progress}
      catalog={catalog}
      adultStatus={adultStatus}
      galleryEntry={endingId === 'intimacy'
        ? intimacyEntry(room)
        : undefined}
      galleryStatus="ready"
      onReplay={() => {}}
      onReturn={() => {}}
    />,
  )
}

test('preserves ending story, stats, rewards and navigation actions', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.settings.exactStats = true
  progress.endingRecaps[roomA.id] = {
    main: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
  }
  const onReplay = vi.fn()
  const onReturn = vi.fn()

  render(
    <ResultScreen
      room={roomA}
      result={{
        roomId: roomA.id,
        endingId: 'main',
        newClues: ['a_consent'],
        newGalleryUnlocks: ['room_a_intimacy'],
      }}
      stats={{ affection: 2, trust: 4, intimacy: 3 }}
      progress={progress}
      catalog={catalog}
      adultStatus="ready"
      galleryStatus="ready"
      onReplay={onReplay}
      onReturn={onReturn}
    />,
  )

  expect(screen.getByText('結局故事段落')).toBeInTheDocument()
  expect(screen.getByTestId('exact-stat-trust')).toHaveTextContent('4')
  expect(screen.getByText('相互同意的承諾')).toBeInTheDocument()
  expect(screen.getByText('停電之夜：親密結局')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '重新遊玩' }))
  await user.click(screen.getByRole('button', { name: '返回大樓' }))
  expect(onReplay).toHaveBeenCalledOnce()
  expect(onReturn).toHaveBeenCalledOnce()
})

test.each(rooms.flatMap((room) => (
  (['main', 'normal', 'intimacy'] as const).map((endingId) => [
    room,
    endingId,
  ] as const)
)))('plays the correct %s %s ending recap and poster', (room, endingId) => {
  const prefix = room.id === 'room_a_blackout' ? 'a' : 'b'
  const progress = createEmptyProgress()
  progress.endingRecaps[room.id] = {
    [endingId]: Array.from({ length: 6 }, (_, index) => `${prefix}${index + 1}`),
  }
  renderResult(room, endingId, progress)

  const expectedFirst = endingId === 'intimacy'
    ? `${prefix}_intimacy_01`
    : `${prefix}1`
  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    expectedFirst,
  )
  for (let index = 0; index < 6; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: '下一格' }))
  }
  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    `${prefix}_ending_${endingId}`,
  )
})

test('uses opening frames and poster for a main ending from an old save', () => {
  renderResult(roomA, 'main')
  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a_open_01',
  )
  for (let index = 0; index < 3; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: '下一格' }))
  }
  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a_ending_main',
  )
})

test.each([
  ['disabled', false],
  ['loading', true],
  ['error', true],
] as const)('keeps %s intimacy playback safe without adult URLs', (
  adultStatus,
  adultContent,
) => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = adultContent
  const { container } = renderResult(
    roomA,
    'intimacy',
    progress,
    adultStatus,
  )

  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a_safe_01',
  )
  expect(container.innerHTML).not.toContain('/adult/')
  if (adultContent) {
    expect(screen.getByRole('status')).toHaveTextContent('已改用安全版')
  }
})

test('uses authored Result intimacy IDs that differ from canonical assumptions', () => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = true
  const customEntry: GalleryEntry = {
    ...intimacyEntry(roomA),
    adultSequence: customAdultIds,
    safeSequence: customSafeIds,
  }

  render(
    <ResultScreen
      room={roomA}
      result={{
        roomId: roomA.id,
        endingId: 'intimacy',
        newClues: [],
        newGalleryUnlocks: [],
      }}
      stats={{ affection: 2, trust: 4, intimacy: 3 }}
      progress={progress}
      catalog={catalog}
      adultStatus="ready"
      galleryEntry={customEntry}
      galleryStatus="ready"
      onReplay={() => {}}
      onReturn={() => {}}
    />,
  )

  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a_intimacy_aftercare_01',
  )
})

test.each(['loading', 'error'] as const)(
  'keeps Result stats and navigation safe while gallery metadata is %s',
  async (galleryStatus) => {
    const user = userEvent.setup()
    const progress = createEmptyProgress()
    progress.settings.exactStats = true
    progress.settings.adultContent = true
    const onReplay = vi.fn()
    const onReturn = vi.fn()
    const { container } = render(
      <ResultScreen
        room={roomA}
        result={{
          roomId: roomA.id,
          endingId: 'intimacy',
          newClues: [],
          newGalleryUnlocks: [],
        }}
        stats={{ affection: 2, trust: 4, intimacy: 3 }}
        progress={progress}
        catalog={catalog}
        adultStatus="ready"
        galleryStatus={galleryStatus}
        onReplay={onReplay}
        onReturn={onReturn}
      />,
    )

    expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
      'data-asset-id',
      'a_open_01',
    )
    expect(screen.getByTestId('exact-stat-trust')).toHaveTextContent('4')
    expect(container.innerHTML).not.toContain('/adult/')
    expect(screen.getByText(
      galleryStatus === 'loading'
        ? /回想資料載入中/
        : /回想資料載入失敗/,
    )).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新遊玩' }))
    await user.click(screen.getByRole('button', { name: '返回大樓' }))
    expect(onReplay).toHaveBeenCalledOnce()
    expect(onReturn).toHaveBeenCalledOnce()
  },
)
