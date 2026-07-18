import { act, fireEvent, render, screen } from '@testing-library/react'
import { createEmptyProgress } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import type { GalleryEntry, RoomDefinition } from '@/domain/types'
import { GalleryScreen } from '@/screens/GalleryScreen'

const ending = (asset: string) => ({
  title: asset,
  asset,
  clueIds: [] as string[],
  galleryUnlocks: [] as string[],
})
const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  backgroundAsset: 'building_a',
  openingAssets: ['a_open_01', 'a_open_02', 'a_open_03'],
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: { n1: { candidates: ['a1', 'a2', 'a3'] } },
  panels: Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
    const id = `a${index + 1}`
    return [id, { next: 'ending', previewAsset: id, dialogue: [], actionLabel: id }]
  })),
  endingRules: [],
  endingContent: {
    main: ending('a_ending_main'),
    normal: ending('a_ending_normal'),
    intimacy: ending('a_ending_intimacy'),
  },
}
const rooms = { [room.id]: room }
const mainEntry: GalleryEntry = {
  id: 'room_a_main',
  roomId: room.id,
  endingId: 'main',
  adult: false,
}
const intimacyEntry: GalleryEntry = {
  id: 'room_a_intimacy',
  roomId: room.id,
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
}
const entries: GalleryEntry[] = [mainEntry, intimacyEntry]
const commonIds = [
  ...room.openingAssets,
  ...Object.keys(room.panels),
  ...Object.values(room.endingContent).map((item) => item.asset),
  ...intimacyEntry.safeSequence!,
]
const catalog: AssetCatalog = {
  common: Object.fromEntries(commonIds.map((id) => [id, {
    preview: `/common/${id}.webp`,
    full: `/common/${id}.webp`,
  }])),
  adult: Object.fromEntries(intimacyEntry.adultSequence!.map((id) => [id, {
    preview: `/adult/${id}.webp`,
    full: `/adult/${id}.webp`,
  }])),
  backgrounds: {},
}

function renderGallery(
  progress = createEmptyProgress(),
  adultStatus: 'disabled' | 'loading' | 'ready' | 'error' = 'ready',
) {
  return render(
    <GalleryScreen
      entries={entries}
      rooms={rooms}
      progress={progress}
      catalog={catalog}
      adultStatus={adultStatus}
      onBack={() => {}}
    />,
  )
}

test('only collected gallery entries are enabled', () => {
  const progress = createEmptyProgress()
  progress.galleryUnlocks = ['room_a_intimacy']
  renderGallery(progress)

  expect(screen.getByRole('button', { name: '停電之夜：主線結局' }))
    .toBeDisabled()
  expect(screen.getByRole('button', { name: '停電之夜：親密結局' }))
    .toBeEnabled()
})

test('safe mode builds only the safe sequence for an adult entry', () => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = false
  progress.galleryUnlocks = ['room_a_intimacy']
  const { container } = renderGallery(progress, 'disabled')

  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a_safe_01',
  )
  expect(container.innerHTML).not.toContain('/adult/')
})

test('uses the saved recap and poster, with an old-save opening fallback', () => {
  const progress = createEmptyProgress()
  progress.galleryUnlocks = ['room_a_main']
  const { rerender } = renderGallery(progress)

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

  progress.endingRecaps[room.id] = {
    main: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
  }
  rerender(
    <GalleryScreen
      entries={entries}
      rooms={rooms}
      progress={progress}
      catalog={catalog}
      adultStatus="ready"
      onBack={() => {}}
    />,
  )
  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a1',
  )
})

test('does not construct or preload adult URLs for a locked entry', () => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = true
  progress.galleryUnlocks = ['room_a_main']
  const { container } = renderGallery(progress, 'ready')

  expect(container.innerHTML).not.toContain('/adult/')
  expect(container.querySelector('img[src*="/adult/"]')).toBeNull()
})

test('switching entries stops the prior playback and restarts at frame one', () => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = true
  progress.galleryUnlocks = ['room_a_main', 'room_a_intimacy']
  progress.endingRecaps[room.id] = {
    main: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
  }
  renderGallery(progress, 'ready')

  fireEvent.click(screen.getByRole('button', { name: '下一格' }))
  expect(screen.getByText('2 / 7')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '停電之夜：親密結局' }))

  expect(screen.getByText('1 / 7')).toBeInTheDocument()
  expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
    'data-asset-id',
    'a_intimacy_01',
  )
  expect(screen.getByRole('button', { name: '停電之夜：親密結局' }))
    .toHaveAttribute('aria-pressed', 'true')
})

describe('gallery playback timer isolation', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  test('safe-to-adult same-length rerender gets a fresh full frame duration', () => {
    const progress = createEmptyProgress()
    progress.settings.adultContent = false
    progress.galleryUnlocks = ['room_a_intimacy']
    const { rerender } = renderGallery(progress, 'disabled')
    act(() => vi.advanceTimersByTime(1_000))

    progress.settings.adultContent = true
    rerender(
      <GalleryScreen
        entries={entries}
        rooms={rooms}
        progress={progress}
        catalog={catalog}
        adultStatus="ready"
        onBack={() => {}}
      />,
    )
    act(() => vi.advanceTimersByTime(800))

    expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
      'data-asset-id',
      'a_intimacy_01',
    )
    expect(document.querySelector('.cinematic-frame-previous')).toBeNull()

    act(() => vi.advanceTimersByTime(915))
    expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
      'data-asset-id',
      'a_intimacy_02',
    )
  })

  test('switching entries while playing stops the old entry timer', () => {
    const progress = createEmptyProgress()
    progress.settings.adultContent = true
    progress.galleryUnlocks = ['room_a_main', 'room_a_intimacy']
    progress.endingRecaps[room.id] = {
      main: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
    }
    renderGallery(progress, 'ready')
    act(() => vi.advanceTimersByTime(1_000))

    fireEvent.click(screen.getByRole('button', {
      name: '停電之夜：親密結局',
    }))
    act(() => vi.advanceTimersByTime(800))

    expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
      'data-asset-id',
      'a_intimacy_01',
    )
    act(() => vi.advanceTimersByTime(915))
    expect(screen.getByTestId('cinematic-stage')).toHaveAttribute(
      'data-asset-id',
      'a_intimacy_02',
    )
  })
})
