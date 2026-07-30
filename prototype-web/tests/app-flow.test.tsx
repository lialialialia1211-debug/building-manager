import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { App } from '@/app/App'
import { createComicStore } from '@/app/store'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import type { StorageAdapter } from '@/domain/persistence'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-comic/office-episode.json'),
  'utf8',
)) as unknown)

const storage: StorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
}

describe('App flow', () => {
  it('shows loading, age confirmation, then the builder', async () => {
    let finishLoading: ((value: typeof episode) => void) | undefined
    const store = createComicStore({
      storage,
      loadEpisode: () => new Promise((resolveLoad) => {
        finishLoading = resolveLoad
      }),
    })
    const user = userEvent.setup()

    render(<App store={store} />)
    expect(screen.getByText('正在載入劇本…')).toBeInTheDocument()

    await act(async () => {
      finishLoading?.(episode)
    })
    expect(screen.getByRole('heading', { name: '成人內容確認' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', {
      name: '我已年滿 18 歲，進入遊戲',
    }))
    expect(screen.getByRole('heading', { name: '鎖門之後' }))
      .toBeInTheDocument()
  })

  it('offers a retry when content loading fails', async () => {
    let attempts = 0
    const store = createComicStore({
      storage,
      loadEpisode: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('劇本暫時失聯')
        return episode
      },
    })
    const user = userEvent.setup()

    render(<App store={store} />)
    expect(await screen.findByText('劇本暫時失聯')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新載入' }))
    expect(await screen.findByRole('heading', { name: '成人內容確認' }))
      .toBeInTheDocument()
  })

  it('routes a completed arrangement through reveal and ending screens', async () => {
    const store = createComicStore({
      storage,
      loadEpisode: async () => episode,
    })
    const user = userEvent.setup()
    render(<App store={store} />)

    await screen.findByRole('heading', { name: '成人內容確認' })
    await user.click(screen.getByRole('button', {
      name: '我已年滿 18 歲，進入遊戲',
    }))
    act(() => {
      episode.perfectFingerprint.forEach((cardId, index) => {
        store.getState().placeCard(cardId, index)
      })
      store.getState().submit()
    })
    expect(screen.getByRole('heading', {
      name: '門鎖上後，沒人再照規矩來。',
    })).toBeInTheDocument()

    act(() => {
      store.getState().revealAll()
      store.getState().advanceReveal()
    })
    expect(screen.getByRole('heading', {
      name: '完美結局：鎖門之後',
    })).toBeInTheDocument()
  })
})
