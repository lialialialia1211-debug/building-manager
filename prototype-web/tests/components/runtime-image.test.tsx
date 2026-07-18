import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RuntimeImage } from '@/components/RuntimeImage'
import type { AssetCatalog } from '@/domain/runtime-assets'

const catalog: AssetCatalog = {
  common: {
    fixture: {
      preview: '/assets/fixture-preview.webp',
      full: '/assets/fixture-full.webp',
    },
  },
  adult: null,
  backgrounds: {},
}

test('renders the requested runtime asset variant as a real image', () => {
  render(
    <RuntimeImage
      assetId="fixture"
      variant="preview"
      catalog={catalog}
      alt="測試圖片"
      className="fixture-image"
    />,
  )

  expect(screen.getByRole('img', { name: '測試圖片' })).toHaveAttribute(
    'src',
    '/assets/fixture-preview.webp',
  )
  expect(screen.getByRole('img', { name: '測試圖片' }))
    .toHaveClass('fixture-image')
})

test('shows an explicit error and retries the same path with a query token', async () => {
  const user = userEvent.setup()
  render(
    <RuntimeImage
      assetId="fixture"
      variant="full"
      catalog={catalog}
      alt="可重試圖片"
    />,
  )

  fireEvent.error(screen.getByRole('img', { name: '可重試圖片' }))

  expect(screen.getByRole('alert')).toHaveTextContent('圖片載入失敗')
  await user.click(screen.getByRole('button', { name: '重試' }))

  expect(screen.getByRole('img', { name: '可重試圖片' }))
    .toHaveAttribute(
      'src',
      '/assets/fixture-full.webp?runtimeRetry=1',
    )
})

test('offers catalog recovery when a hand-built catalog is incomplete', async () => {
  const user = userEvent.setup()
  const retryCatalog = vi.fn()
  render(
    <RuntimeImage
      assetId="missing"
      variant="full"
      catalog={catalog}
      alt="不存在的圖片"
      onRetry={retryCatalog}
    />,
  )

  expect(screen.getByRole('alert')).toHaveTextContent('圖片載入失敗')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '重試' }))
  expect(retryCatalog).toHaveBeenCalledOnce()
})
