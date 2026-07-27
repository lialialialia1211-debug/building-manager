import {
  afterEach,
  beforeEach,
  expect,
  test,
  vi,
} from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useRuntimeAssets } from '@/hooks/use-runtime-assets'

const commonManifest = {
  schemaVersion: 2,
  mode: 'playable',
  backgrounds: {
    bg_room_a: '/assets/common/backgrounds/bg_room_a_master.webp',
  },
  assets: {
    a1_fuse: {
      preview: '/assets/common/panels/a1_fuse_preview.webp',
      full: '/assets/common/panels/a1_fuse_master.webp',
    },
  },
}

const adultManifest = {
  schemaVersion: 1,
  assets: {
    a_intimacy_01: {
      preview: '/assets/adult/a_intimacy_01_preview.webp',
      full: '/assets/adult/a_intimacy_01_master.webp',
    },
  },
}

function jsonResponse(value: unknown): Response {
  return {
    ok: true,
    json: async () => value,
  } as Response
}

const requested: string[] = []
let failAdult = false
let failCommon = false

beforeEach(() => {
  requested.length = 0
  failAdult = false
  failCommon = false
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    requested.push(url)
    if (url.includes('adult-asset-manifest.json')) {
      return failAdult
        ? Promise.resolve({ ok: false } as Response)
        : Promise.resolve(jsonResponse(adultManifest))
    }
    return failCommon
      ? Promise.resolve({ ok: false } as Response)
      : Promise.resolve(jsonResponse(commonManifest))
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('adult-off loads only the common manifest', async () => {
  const { result } = renderHook(() => useRuntimeAssets(false))
  await waitFor(() =>
    expect(result.current.commonStatus).toBe('ready'))

  expect(requested.every((url) =>
    !url.includes('adult-asset-manifest.json'))).toBe(true)
  expect(result.current.adultStatus).toBe('disabled')
  expect(result.current.catalog?.adult).toBeNull()
  expect(result.current.catalog?.common.a1_fuse).toBeDefined()
})

test('enabling adult lazy-loads the adult manifest', async () => {
  const { result, rerender } = renderHook(
    ({ adult }) => useRuntimeAssets(adult),
    { initialProps: { adult: false } },
  )
  await waitFor(() =>
    expect(result.current.commonStatus).toBe('ready'))

  rerender({ adult: true })
  await waitFor(() =>
    expect(result.current.adultStatus).toBe('ready'))

  expect(requested.some((url) =>
    url.includes('adult-asset-manifest.json'))).toBe(true)
  expect(result.current.catalog?.adult?.a_intimacy_01).toBeDefined()
})

test('disabling adult clears the adult catalog', async () => {
  const { result, rerender } = renderHook(
    ({ adult }) => useRuntimeAssets(adult),
    { initialProps: { adult: true } },
  )
  await waitFor(() =>
    expect(result.current.adultStatus).toBe('ready'))

  rerender({ adult: false })
  await waitFor(() =>
    expect(result.current.adultStatus).toBe('disabled'))
  expect(result.current.catalog?.adult).toBeNull()
})

test('adult failure keeps common ready and offers retry', async () => {
  failAdult = true
  const { result } = renderHook(() => useRuntimeAssets(true))
  await waitFor(() =>
    expect(result.current.commonStatus).toBe('ready'))
  await waitFor(() =>
    expect(result.current.adultStatus).toBe('error'))

  failAdult = false
  act(() => {
    result.current.retryAdult()
  })
  await waitFor(() =>
    expect(result.current.adultStatus).toBe('ready'))
})

test('common failure blocks and offers retry', async () => {
  failCommon = true
  const { result } = renderHook(() => useRuntimeAssets(false))
  await waitFor(() =>
    expect(result.current.commonStatus).toBe('error'))

  failCommon = false
  act(() => {
    result.current.retryCommon()
  })
  await waitFor(() =>
    expect(result.current.commonStatus).toBe('ready'))
})
