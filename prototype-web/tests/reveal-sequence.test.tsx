import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createComicStore } from '@/app/store'
import { RevealSequence } from '@/components/RevealSequence'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import type { StorageAdapter } from '@/domain/persistence'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-comic/office-episode.json'),
  'utf8',
)) as unknown)

async function createRevealStore() {
  const storage: StorageAdapter = {
    getItem: () => null,
    setItem: () => undefined,
  }
  const store = createComicStore({
    storage,
    loadEpisode: async () => episode,
  })
  await store.getState().initialize()
  store.getState().confirmAge()
  episode.perfectFingerprint.forEach((cardId, index) => {
    store.getState().placeCard(cardId, index)
  })
  store.getState().submit()
  return store
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches })))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('RevealSequence', () => {
  it('reveals all four panels and the route CG without repeated clicks', async () => {
    vi.useFakeTimers()
    stubReducedMotion(false)
    const store = await createRevealStore()
    render(<RevealSequence store={store} />)

    expect(screen.getAllByText('尚未揭露')).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /揭露第/ }))
      .not.toBeInTheDocument()

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getAllByRole('group', { name: /格已揭露/ }))
      .toHaveLength(4)
    expect(screen.getByRole('img', { name: '路線 CG' }))
      .toBeInTheDocument()
    expect(screen.getByText('你真的想我放開？', { exact: false }))
      .toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '閱讀後續' }))
    expect(store.getState().screen).toBe('ending')
  })

  it('shows all panels and the route CG immediately for reduced motion', async () => {
    stubReducedMotion(true)
    const store = await createRevealStore()

    await act(async () => {
      render(<RevealSequence store={store} />)
    })

    expect(screen.getAllByRole('group', { name: /格已揭露/ }))
      .toHaveLength(4)
    expect(screen.getByRole('img', { name: '路線 CG' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: '閱讀後續' })).toBeEnabled()
  })

  it('returns to the builder without changing the arrangement', async () => {
    vi.useFakeTimers()
    stubReducedMotion(false)
    const store = await createRevealStore()
    const before = store.getState().slots
    render(<RevealSequence store={store} />)

    fireEvent.click(screen.getByRole('button', { name: '回去重排' }))

    expect(store.getState().screen).toBe('builder')
    expect(store.getState().slots).toEqual(before)
  })
})
