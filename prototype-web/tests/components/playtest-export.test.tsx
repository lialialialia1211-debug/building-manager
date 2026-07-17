import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach } from 'vitest'
import { PlaytestExport } from '@/screens/PlaytestExport'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('downloads JSON only after the explicit export button is pressed', async () => {
  const user = userEvent.setup()
  const blob = new Blob(['{"version":1,"events":[]}'], {
    type: 'application/json',
  })
  const exporter = {
    exportBlob: vi.fn(() => blob),
  }
  const click = vi.spyOn(
    HTMLAnchorElement.prototype,
    'click',
  ).mockImplementation(() => {})
  const createObjectURL = vi.fn(() => 'blob:playtest-export')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', {
    createObjectURL,
    revokeObjectURL,
  })

  render(<PlaytestExport exporter={exporter} />)

  expect(exporter.exportBlob).not.toHaveBeenCalled()
  expect(createObjectURL).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', {
    name: '匯出玩家測試 JSON',
  }))

  expect(exporter.exportBlob).toHaveBeenCalledOnce()
  expect(createObjectURL).toHaveBeenCalledWith(blob)
  expect(click).toHaveBeenCalledOnce()
  expect(revokeObjectURL).toHaveBeenCalledWith(
    'blob:playtest-export',
  )
})

test('removes the anchor and revokes the URL when download click throws', () => {
  const blob = new Blob(['{"version":1,"events":[]}'], {
    type: 'application/json',
  })
  const exporter = {
    exportBlob: vi.fn(() => blob),
  }
  vi.spyOn(
    HTMLAnchorElement.prototype,
    'click',
  ).mockImplementation(() => {
    throw new Error('download failed')
  })
  const remove = vi.spyOn(
    HTMLAnchorElement.prototype,
    'remove',
  )
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:playtest-export'),
    revokeObjectURL,
  })
  render(<PlaytestExport exporter={exporter} />)
  const preventExpectedError = (event: ErrorEvent) => {
    if (
      event.error instanceof Error
      && event.error.message === 'download failed'
    ) {
      event.preventDefault()
    }
  }
  window.addEventListener('error', preventExpectedError)

  try {
    fireEvent.click(screen.getByRole('button', {
      name: '匯出玩家測試 JSON',
    }))
  } finally {
    window.removeEventListener('error', preventExpectedError)
  }

  expect(remove).toHaveBeenCalledOnce()
  expect(revokeObjectURL).toHaveBeenCalledWith(
    'blob:playtest-export',
  )
})
