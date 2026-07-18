import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

const commonManifest = JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/asset-manifest.json'),
  'utf8',
))
const adultManifest = JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/adult-asset-manifest.json'),
  'utf8',
))
const hookModulePath = '../../src/hooks/use-runtime-assets'

function jsonResponse(value: unknown, ok = true): Response {
  return {
    ok,
    json: async () => value,
  } as Response
}

async function loadHook() {
  return import(hookModulePath).catch(() => null)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('loads the common catalog first and lazily loads adult assets', async () => {
  const runtimeAssets = await loadHook()
  const fetch = vi.fn((url: string) => Promise.resolve(jsonResponse(
    url.endsWith('adult-asset-manifest.json')
      ? adultManifest
      : commonManifest,
  )))
  vi.stubGlobal('fetch', fetch)

  expect(runtimeAssets).not.toBeNull()
  const { result, rerender } = renderHook(
    ({ adultContent }) => runtimeAssets!.useRuntimeAssets(adultContent),
    { initialProps: { adultContent: false } },
  )

  await waitFor(() => {
    expect(result.current.commonStatus).toBe('ready')
  })
  expect(result.current.adultStatus).toBe('disabled')
  expect(result.current.catalog?.adult).toBeNull()
  expect(fetch).toHaveBeenCalledWith('/asset-manifest.json')
  expect(fetch).not.toHaveBeenCalledWith('/adult-asset-manifest.json')

  rerender({ adultContent: true })
  await waitFor(() => {
    expect(result.current.adultStatus).toBe('ready')
  })
  expect(fetch).toHaveBeenCalledWith('/adult-asset-manifest.json')
  expect(Object.keys(result.current.catalog?.adult ?? {})).toHaveLength(12)

  rerender({ adultContent: false })
  await waitFor(() => {
    expect(result.current.adultStatus).toBe('disabled')
  })
  expect(result.current.catalog?.adult).toBeNull()
})

test('preserves the common catalog when the adult request fails and retries it', async () => {
  const runtimeAssets = await loadHook()
  let adultAttempts = 0
  const fetch = vi.fn((url: string) => {
    if (url.endsWith('adult-asset-manifest.json')) {
      adultAttempts += 1
      return Promise.resolve(jsonResponse(
        adultAttempts === 1 ? {} : adultManifest,
        adultAttempts !== 1,
      ))
    }
    return Promise.resolve(jsonResponse(commonManifest))
  })
  vi.stubGlobal('fetch', fetch)

  expect(runtimeAssets).not.toBeNull()
  const { result } = renderHook(() =>
    runtimeAssets!.useRuntimeAssets(true))

  await waitFor(() => {
    expect(result.current.adultStatus).toBe('error')
  })
  expect(result.current.commonStatus).toBe('ready')
  expect(result.current.catalog?.adult).toBeNull()

  act(() => result.current.retryAdult())
  await waitFor(() => {
    expect(result.current.adultStatus).toBe('ready')
  })
  expect(adultAttempts).toBe(2)
})

test('reports a blocking common error and retries it', async () => {
  const runtimeAssets = await loadHook()
  let commonAttempts = 0
  const fetch = vi.fn(() => {
    commonAttempts += 1
    return Promise.resolve(jsonResponse(
      commonAttempts === 1 ? {} : commonManifest,
      commonAttempts !== 1,
    ))
  })
  vi.stubGlobal('fetch', fetch)

  expect(runtimeAssets).not.toBeNull()
  const { result } = renderHook(() =>
    runtimeAssets!.useRuntimeAssets(false))

  await waitFor(() => {
    expect(result.current.commonStatus).toBe('error')
  })
  expect(result.current.catalog).toBeNull()

  act(() => result.current.retryCommon())
  await waitFor(() => {
    expect(result.current.commonStatus).toBe('ready')
  })
  expect(commonAttempts).toBe(2)
})

test('treats an invalid common manifest as a blocking error', async () => {
  const runtimeAssets = await loadHook()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse({}))))

  expect(runtimeAssets).not.toBeNull()
  const { result } = renderHook(() =>
    runtimeAssets!.useRuntimeAssets(false))

  await waitFor(() => {
    expect(result.current.commonStatus).toBe('error')
  })
  expect(result.current.catalog).toBeNull()
})
