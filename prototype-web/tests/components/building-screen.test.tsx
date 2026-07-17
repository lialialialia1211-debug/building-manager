import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyProgress } from '@/domain/progress'
import { BuildingScreen } from '@/screens/BuildingScreen'

test('opens either available room and renders four locked silhouettes', async () => {
  const user = userEvent.setup()
  const onOpenRoom = vi.fn()
  const onOpenGallery = vi.fn()
  const onOpenSettings = vi.fn()
  render(
    <BuildingScreen
      progress={undefined}
      onOpenRoom={onOpenRoom}
      onOpenGallery={onOpenGallery}
      onOpenSettings={onOpenSettings}
    />,
  )

  await user.click(
    screen.getByRole('button', { name: /停電之夜/ }),
  )
  await user.click(
    screen.getByRole('button', { name: /牆後的聲音/ }),
  )

  expect(onOpenRoom).toHaveBeenNthCalledWith(
    1,
    'room_a_blackout',
  )
  expect(onOpenRoom).toHaveBeenNthCalledWith(2, 'room_b_wall')
  expect(
    screen.getAllByLabelText('未開放房間'),
  ).toHaveLength(4)

  await user.click(screen.getByRole('button', { name: '圖鑑' }))
  await user.click(screen.getByRole('button', { name: '設定' }))
  expect(onOpenGallery).toHaveBeenCalledOnce()
  expect(onOpenSettings).toHaveBeenCalledOnce()
})

test('renders the sixth-room tease after both main endings', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main'],
    room_b_wall: ['main'],
  }

  render(
    <BuildingScreen
      progress={progress}
      onOpenRoom={() => {}}
      onOpenGallery={() => {}}
      onOpenSettings={() => {}}
    />,
  )

  expect(
    screen.getByLabelText('不存在的第六房間'),
  ).toBeInTheDocument()
})

test('does not render the sixth-room tease after one main ending', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main'],
  }

  render(
    <BuildingScreen
      progress={progress}
      onOpenRoom={() => {}}
      onOpenGallery={() => {}}
      onOpenSettings={() => {}}
    />,
  )

  expect(
    screen.queryByLabelText('不存在的第六房間'),
  ).not.toBeInTheDocument()
})
