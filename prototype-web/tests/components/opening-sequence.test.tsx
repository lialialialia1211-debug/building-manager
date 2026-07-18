import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OpeningSequence } from '@/components/OpeningSequence'
import type { AssetCatalog } from '@/domain/runtime-assets'

const catalog: AssetCatalog = {
  common: Object.fromEntries(
    [1, 2, 3].map((frame) => [
      `open_0${frame}`,
      {
        preview: `/assets/open-0${frame}-preview.webp`,
        full: `/assets/open-0${frame}-full.webp`,
      },
    ]),
  ),
  adult: null,
  backgrounds: {},
}

test('advances through three opening frames and completes on the third', async () => {
  const user = userEvent.setup()
  const onComplete = vi.fn()
  render(
    <OpeningSequence
      title="停電之夜"
      assetIds={['open_01', 'open_02', 'open_03']}
      dialogue={['第一段', '第二段', '第三段']}
      catalog={catalog}
      onComplete={onComplete}
    />,
  )

  expect(screen.getByText('1 / 3')).toBeInTheDocument()
  expect(screen.getByText('第一段')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '停電之夜開場 1' }))
    .toHaveAttribute('src', '/assets/open-01-full.webp')

  await user.click(screen.getByRole('button', { name: '下一張' }))
  expect(screen.getByText('2 / 3')).toBeInTheDocument()
  expect(screen.getByText('第二段')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '下一張' }))
  expect(screen.getByText('3 / 3')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '繼續' }))

  expect(onComplete).toHaveBeenCalledOnce()
})

test('reuses the last authored dialogue without rendering a blank bubble', async () => {
  const user = userEvent.setup()
  render(
    <OpeningSequence
      title="牆後的聲音"
      assetIds={['open_01', 'open_02', 'open_03']}
      dialogue={['唯一一段']}
      catalog={catalog}
      onComplete={() => {}}
    />,
  )

  await user.click(screen.getByRole('button', { name: '下一張' }))
  await user.click(screen.getByRole('button', { name: '下一張' }))

  expect(screen.getByText('唯一一段')).toBeInTheDocument()
  expect(screen.getByTestId('opening-dialogue')).not.toBeEmptyDOMElement()
})

test('supports keyboard progress and escape skip', () => {
  const onComplete = vi.fn()
  render(
    <OpeningSequence
      title="停電之夜"
      assetIds={['open_01', 'open_02', 'open_03']}
      dialogue={[]}
      catalog={catalog}
      onComplete={onComplete}
    />,
  )

  fireEvent.keyDown(window, { key: 'Enter' })
  expect(screen.getByText('2 / 3')).toBeInTheDocument()
  fireEvent.keyDown(window, { key: ' ' })
  expect(screen.getByText('3 / 3')).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })

  expect(onComplete).toHaveBeenCalledOnce()
  expect(screen.queryByTestId('opening-dialogue')).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: '跳過開場' }),
  ).toBeInTheDocument()
})

test('lets Enter activate image retry without advancing the opening', async () => {
  const user = userEvent.setup()
  render(
    <OpeningSequence
      title="停電之夜"
      assetIds={['open_01', 'open_02', 'open_03']}
      dialogue={[]}
      catalog={catalog}
      onComplete={() => {}}
    />,
  )
  fireEvent.error(screen.getByRole('img', { name: '停電之夜開場 1' }))
  const retry = screen.getByRole('button', { name: '重試' })
  retry.focus()

  await user.keyboard('{Enter}')

  expect(screen.getByText('1 / 3')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '停電之夜開場 1' }))
    .toHaveAttribute(
      'src',
      '/assets/open-01-full.webp?runtimeRetry=1',
    )
})

test.each([
  ['Enter', '{Enter}'],
  ['Space', ' '],
])('lets %s activate the focused skip button', async (_name, key) => {
  const user = userEvent.setup()
  const onComplete = vi.fn()
  render(
    <OpeningSequence
      title="停電之夜"
      assetIds={['open_01', 'open_02', 'open_03']}
      dialogue={[]}
      catalog={catalog}
      onComplete={onComplete}
    />,
  )
  screen.getByRole('button', { name: '跳過開場' }).focus()

  await user.keyboard(key)

  expect(onComplete).toHaveBeenCalledOnce()
  expect(screen.getByText('1 / 3')).toBeInTheDocument()
})

test('does not advance from a contenteditable target', async () => {
  const user = userEvent.setup()
  render(
    <>
      <div contentEditable role="textbox" aria-label="編輯內容" />
      <OpeningSequence
        title="停電之夜"
        assetIds={['open_01', 'open_02', 'open_03']}
        dialogue={[]}
        catalog={catalog}
        onComplete={() => {}}
      />
    </>,
  )
  await user.click(screen.getByRole('textbox', { name: '編輯內容' }))

  await user.keyboard('{Enter}')

  expect(screen.getByText('1 / 3')).toBeInTheDocument()
})
