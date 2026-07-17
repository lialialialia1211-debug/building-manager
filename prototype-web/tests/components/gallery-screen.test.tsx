import { render, screen } from '@testing-library/react'
import { createEmptyProgress } from '@/domain/progress'
import type { GalleryEntry } from '@/domain/types'
import { GalleryScreen } from '@/screens/GalleryScreen'

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
      '/assets/adult/a01.webp',
      '/assets/adult/a02.webp',
      '/assets/adult/a03.webp',
      '/assets/adult/a04.webp',
      '/assets/adult/a05.webp',
      '/assets/adult/a06.webp',
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

test('safe mode builds only the safe sequence for an adult entry', () => {
  const progress = createEmptyProgress()
  progress.settings.adultContent = false
  progress.galleryUnlocks = ['room_a_intimacy']

  const { container } = render(
    <GalleryScreen
      entries={entries}
      progress={progress}
      onBack={() => {}}
    />,
  )

  expect(
    [...container.querySelectorAll('[data-asset-id]')].map(
      (element) => element.getAttribute('data-asset-id'),
    ),
  ).toEqual([
    'a_safe_01',
    'a_safe_02',
    'a_safe_03',
    'a_safe_04',
    'a_safe_05',
    'a_safe_06',
  ])
  expect(container.innerHTML).not.toContain('/adult/')
})
