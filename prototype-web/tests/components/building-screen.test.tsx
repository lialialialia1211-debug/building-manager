import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createEmptyProgress } from '@/domain/progress'
import type { AssetCatalog } from '@/domain/runtime-assets'
import { BuildingScreen } from '@/screens/BuildingScreen'

const catalog: AssetCatalog = {
  common: Object.fromEntries(
    [1, 2, 3].map((frame) => [
      `sixth_0${frame}`,
      {
        preview: `/art/sixth-0${frame}-preview.webp`,
        full: `/art/sixth-0${frame}-full.webp`,
      },
    ]),
  ),
  adult: null,
  backgrounds: {
    building_a: '/art/building-a.webp',
    building_b: '/art/building-b.webp',
  },
}

test('opens either available room and renders four locked silhouettes', async () => {
  const user = userEvent.setup()
  const onOpenRoom = vi.fn()
  const onOpenGallery = vi.fn()
  const onOpenSettings = vi.fn()
  render(
    <BuildingScreen
      progress={undefined}
      catalog={catalog}
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
  expect(screen.getByText(/可玩測試版/)).toHaveTextContent(
    'placeholder art',
  )
  expect(screen.getByRole('img', { name: '停電之夜房間背景' }))
    .toHaveAttribute('src', '/art/building-a.webp')
  expect(screen.getByRole('img', { name: '牆後的聲音房間背景' }))
    .toHaveAttribute('src', '/art/building-b.webp')
  expect(document.body.innerHTML).not.toContain('data:image/svg+xml')
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
      catalog={catalog}
      onOpenRoom={() => {}}
      onOpenGallery={() => {}}
      onOpenSettings={() => {}}
    />,
  )

  expect(
    screen.getByLabelText('不存在的第六房間'),
  ).toBeInTheDocument()
  expect(
    screen.getAllByRole('img', { name: /不存在的第六房間異象/ }),
  ).toHaveLength(3)
  expect(screen.getByRole('img', {
    name: '不存在的第六房間異象 3',
  })).toHaveAttribute('src', '/art/sixth-03-preview.webp')
  expect(screen.queryByAltText(/六宮格/)).not.toBeInTheDocument()
})

test('does not render the sixth-room tease after one main ending', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main'],
  }

  render(
    <BuildingScreen
      progress={progress}
      catalog={catalog}
      onOpenRoom={() => {}}
      onOpenGallery={() => {}}
      onOpenSettings={() => {}}
    />,
  )

  expect(
    screen.queryByLabelText('不存在的第六房間'),
  ).not.toBeInTheDocument()
})
