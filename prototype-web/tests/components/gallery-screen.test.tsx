import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyProgress } from '@/domain/progress'
import type { GalleryEntry } from '@/domain/types'
import { GalleryScreen } from '@/screens/GalleryScreen'
import { makeTestCatalog } from '../helpers/catalog'

const entries: GalleryEntry[] = [
  {
    id: 'room_a_main',
    roomId: 'room_a_blackout',
    endingId: 'main',
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
]

test('only collected gallery entries are enabled', () => {
  const progress = createEmptyProgress()
  progress.galleryUnlocks = ['room_a_intimacy']

  render(
    <GalleryScreen
      entries={entries}
      progress={progress}
      catalog={makeTestCatalog()}
      onBack={() => {}}
    />,
  )

  expect(
    screen.getByRole('button', { name: '停電之夜：主線結局' }),
  ).toBeDisabled()
  expect(
    screen.getByRole('button', { name: '停電之夜：親密結局' }),
  ).toBeEnabled()
})

test('safe mode replays only safe frames for an adult entry', async () => {
  const user = userEvent.setup()
  const progress = createEmptyProgress()
  progress.settings.adultContent = false
  progress.galleryUnlocks = ['room_a_intimacy']

  const { container } = render(
    <GalleryScreen
      entries={entries}
      progress={progress}
      catalog={makeTestCatalog({ adult: false })}
      onBack={() => {}}
    />,
  )

  await user.click(
    screen.getByRole('button', { name: '停電之夜：親密結局' }),
  )

  const firstFrame = screen
    .getByTestId('cinematic-player')
    .querySelector('[data-asset-id]')
  expect(firstFrame?.getAttribute('data-asset-id')).toBe('a_safe_01')
  expect(container.innerHTML).not.toContain('/adult/')
})
