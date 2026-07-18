import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { CandidateCard } from '@/components/CandidateCard'
import type { AssetCatalog } from '@/domain/runtime-assets'
import '@/styles/comic.css'

const catalog: AssetCatalog = {
  common: {
    'preview-only': {
      preview: '/assets/preview-only-preview.webp',
      full: '/assets/preview-only-full.webp',
    },
    'panel-id': {
      preview: '/assets/panel-id-preview.webp',
      full: '/assets/panel-id-full.webp',
    },
  },
  adult: null,
  backgrounds: {},
}

test('uses previewAsset and lets retry recover without choosing', async () => {
  const user = userEvent.setup()
  const onChoose = vi.fn()
  render(
    <CandidateCard
      panelId="panel-id"
      previewAsset="preview-only"
      actionLabel="測試行動"
      catalog={catalog}
      variant="preview"
      disabled={false}
      onChoose={onChoose}
    />,
  )

  const image = screen.getByRole('img', { name: '測試行動' })
  expect(image).toHaveAttribute(
    'src',
    '/assets/preview-only-preview.webp',
  )

  fireEvent.error(image)
  const retry = screen.getByRole('button', { name: '重試' })
  await user.click(retry)

  expect(screen.getByRole('img', { name: '測試行動' })).toHaveAttribute(
    'src',
    '/assets/preview-only-preview.webp?runtimeRetry=1',
  )
  expect(onChoose).not.toHaveBeenCalled()

  const select = screen.getByRole('button', { name: '選擇行動：測試行動' })
  expect(select).toBeVisible()
  expect(select).toHaveTextContent('測試行動')
  expect(getComputedStyle(select).position).not.toBe('absolute')
  const css = readFileSync(resolve(process.cwd(), 'src/styles/comic.css'), 'utf8')
  expect(css).toMatch(/\.candidate-card-select\s*\{[^}]*cursor:\s*pointer/s)
  expect(css).not.toMatch(/\.candidate-card\s*\{[^}]*cursor:\s*pointer/s)
})
