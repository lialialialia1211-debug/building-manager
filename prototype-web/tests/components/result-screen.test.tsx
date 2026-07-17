import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyProgress } from '@/domain/progress'
import type { RoomDefinition } from '@/domain/types'
import { ResultScreen } from '@/screens/ResultScreen'

const emptyEnding = {
  title: 'Fixture ending',
  asset: 'ending-fixture',
  clueIds: [] as string[],
  galleryUnlocks: [] as string[],
}

const room: RoomDefinition = {
  schemaVersion: 1,
  id: 'room_a_blackout',
  title: '停電之夜',
  startNode: 'n1',
  safeNode: 'n1',
  endingAnchor: 'ending',
  nodes: {
    n1: { candidates: ['p1', 'p2', 'p3'] },
  },
  panels: {
    p1: {
      next: 'ending',
      previewAsset: 'p1',
      dialogue: ['Fixture dialogue'],
      actionLabel: '伸出手',
    },
    p2: {
      next: 'ending',
      previewAsset: 'p2',
      dialogue: ['Fixture dialogue'],
      actionLabel: '留下',
    },
    p3: {
      next: 'ending',
      previewAsset: 'p3',
      dialogue: ['Fixture dialogue'],
      actionLabel: '離開',
    },
  },
  endingRules: [
    { id: 'intimacy', priority: 300, conditions: {} },
    { id: 'main', priority: 200, conditions: {} },
    { id: 'normal', priority: 100, conditions: {} },
  ],
  endingContent: {
    main: emptyEnding,
    normal: emptyEnding,
    intimacy: {
      title: '停電之夜的承諾',
      asset: 'room_a_intimacy',
      clueIds: ['a_consent'],
      galleryUnlocks: ['room_a_intimacy'],
    },
  },
}

test('shows the settled ending, final stats, new rewards and actions', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.settings.exactStats = true
  const onReplay = vi.fn()
  const onReturn = vi.fn()

  render(
    <ResultScreen
      room={room}
      result={{
        roomId: room.id,
        endingId: 'intimacy',
        newClues: ['a_consent'],
        newGalleryUnlocks: ['room_a_intimacy'],
      }}
      stats={{ affection: 2, trust: 4, intimacy: 3 }}
      progress={progress}
      onReplay={onReplay}
      onReturn={onReturn}
    />,
  )

  expect(screen.getByTestId('result-screen')).toHaveAttribute(
    'aria-labelledby',
    'ending-title',
  )
  expect(
    screen.getByRole('heading', { name: '停電之夜的承諾' }),
  ).toHaveAttribute('id', 'ending-title')
  expect(screen.getByTestId('exact-stat-trust')).toHaveTextContent('4')
  expect(screen.getByText('相互同意的承諾')).toBeInTheDocument()
  expect(screen.getByText('停電之夜：親密結局')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '重新遊玩' }))
  await user.click(screen.getByRole('button', { name: '返回大樓' }))

  expect(onReplay).toHaveBeenCalledOnce()
  expect(onReturn).toHaveBeenCalledOnce()
})

test('safe result presentation does not expose an adult replay asset', () => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = false

  render(
    <ResultScreen
      room={room}
      result={{
        roomId: room.id,
        endingId: 'intimacy',
        newClues: [],
        newGalleryUnlocks: [],
      }}
      stats={{ affection: 0, trust: 4, intimacy: 3 }}
      progress={progress}
      onReplay={() => {}}
      onReturn={() => {}}
    />,
  )

  expect(screen.getByTestId('result-art')).toHaveAttribute(
    'data-asset-id',
    'a_safe_06',
  )
  expect(screen.getByTestId('result-screen').innerHTML)
    .not.toContain('/adult/')
  expect(screen.getByTestId('result-screen').innerHTML)
    .not.toContain('a_intimacy_06')
})
