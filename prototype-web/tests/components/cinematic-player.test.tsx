import { act, fireEvent, render, screen } from '@testing-library/react'
import { CinematicPlayer } from '@/components/CinematicPlayer'
import type { AssetCatalog } from '@/domain/runtime-assets'

const assetIds = ['frame_1', 'frame_2', 'frame_3', 'frame_4']
const catalog: AssetCatalog = {
  common: Object.fromEntries(assetIds.map((assetId) => [
    assetId,
    {
      preview: `/assets/${assetId}-preview.webp`,
      full: `/assets/${assetId}-full.webp`,
    },
  ])),
  adult: null,
  backgrounds: {},
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

test('plays first, middle and last frames across 12 seconds then finishes', () => {
  const onFinished = vi.fn()
  render(
    <CinematicPlayer
      assetIds={assetIds}
      catalog={catalog}
      title="停電之夜回想"
      onFinished={onFinished}
    />,
  )

  expect(screen.getByText('1 / 4')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '停電之夜回想 1 / 4' }))
    .toHaveAttribute('src', '/assets/frame_1-full.webp')

  act(() => vi.advanceTimersByTime(6_000))
  expect(screen.getByText('3 / 4')).toBeInTheDocument()

  act(() => vi.advanceTimersByTime(3_000))
  expect(screen.getByText('4 / 4')).toBeInTheDocument()
  expect(onFinished).not.toHaveBeenCalled()

  act(() => vi.advanceTimersByTime(3_000))
  expect(onFinished).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: '播放' })).toBeInTheDocument()
})

test('supports pause, play, replay, previous and next controls', () => {
  render(
    <CinematicPlayer
      assetIds={assetIds}
      catalog={catalog}
      durationMs={4_000}
      autoPlay={false}
      title="結局回想"
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: '下一格' }))
  expect(screen.getByText('2 / 4')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '上一格' }))
  expect(screen.getByText('1 / 4')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '播放' }))
  act(() => vi.advanceTimersByTime(1_000))
  expect(screen.getByText('2 / 4')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '暫停' }))
  act(() => vi.advanceTimersByTime(2_000))
  expect(screen.getByText('2 / 4')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '重播' }))
  expect(screen.getByText('1 / 4')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '暫停' })).toBeInTheDocument()
})

test('keeps the prior frame behind the current frame for crossfade', () => {
  const { container } = render(
    <CinematicPlayer
      assetIds={assetIds}
      catalog={catalog}
      autoPlay={false}
      title="結局回想"
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: '下一格' }))

  expect(container.querySelector('.cinematic-frame-previous'))
    .toHaveAttribute('src', '/assets/frame_1-full.webp')
  expect(screen.getByRole('img', { name: '結局回想 2 / 4' }))
    .toHaveAttribute('src', '/assets/frame_2-full.webp')
})

test('keeps advancing when the current RuntimeImage fails and retries', () => {
  render(
    <CinematicPlayer
      assetIds={assetIds}
      catalog={catalog}
      durationMs={4_000}
      title="結局回想"
    />,
  )

  fireEvent.error(screen.getByRole('img', { name: '結局回想 1 / 4' }))
  fireEvent.click(screen.getByRole('button', { name: '重試' }))
  expect(screen.getByRole('img', { name: '結局回想 1 / 4' }))
    .toHaveAttribute('src', '/assets/frame_1-full.webp?runtimeRetry=1')

  act(() => vi.advanceTimersByTime(1_000))
  expect(screen.getByText('2 / 4')).toBeInTheDocument()
})

test('resets to the first frame when the sequence changes', () => {
  const { rerender } = render(
    <CinematicPlayer
      assetIds={assetIds}
      catalog={catalog}
      durationMs={4_000}
      title="第一段回想"
    />,
  )
  act(() => vi.advanceTimersByTime(2_000))
  expect(screen.getByText('3 / 4')).toBeInTheDocument()

  rerender(
    <CinematicPlayer
      assetIds={['frame_4', 'frame_3']}
      catalog={catalog}
      durationMs={4_000}
      title="第二段回想"
    />,
  )

  expect(screen.getByText('1 / 2')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '第二段回想 1 / 2' }))
    .toHaveAttribute('src', '/assets/frame_4-full.webp')
})

test('renders an accessible empty state without starting a timer', () => {
  const onFinished = vi.fn()
  render(
    <CinematicPlayer
      assetIds={[]}
      catalog={catalog}
      title="空回想"
      onFinished={onFinished}
    />,
  )

  expect(screen.getByRole('status')).toHaveTextContent('沒有可播放的回想')
  expect(screen.getByText('0 / 0')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '播放' })).toBeDisabled()
  expect(vi.getTimerCount()).toBe(0)
  expect(onFinished).not.toHaveBeenCalled()
})
