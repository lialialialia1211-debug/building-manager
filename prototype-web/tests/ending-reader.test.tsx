import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createComicStore, type ComicStore } from '@/app/store'
import { EndingReader } from '@/components/EndingReader'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import type { StorageAdapter } from '@/domain/persistence'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-episode.json'),
  'utf8',
)) as unknown)

async function completeRoute(slots: readonly string[]): Promise<ComicStore> {
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
  slots.forEach((cardId, index) => store.getState().placeCard(cardId, index))
  store.getState().submit()
  for (let index = 0; index < 5; index += 1) {
    store.getState().advanceReveal()
  }
  return store
}

describe('EndingReader', () => {
  it('paginates the perfect ending into three pages of four frames', async () => {
    const store = await completeRoute(episode.perfectFingerprint)
    const user = userEvent.setup()
    render(<EndingReader store={store} />)

    expect(screen.getByText('第 1 / 3 頁')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /結局分鏡/ })).toHaveLength(4)
    expect(screen.getByRole('img', { name: '結局分鏡 1' }))
      .toHaveAttribute('src', expect.stringContaining('perfect_01'))
    expect(screen.getByRole('button', { name: '上一頁' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '下一頁' }))
    expect(screen.getByText('第 2 / 3 頁')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '結局分鏡 5' }))
      .toHaveAttribute('src', expect.stringContaining('perfect_05'))
  })

  it('shows a side ending as one four-frame page', async () => {
    const store = await completeRoute([
      'card_char_female_rover',
      'card_char_xiangli_yao',
      ...episode.cards
        .filter((card) => card.kind !== 'character')
        .slice(0, 6)
        .map((card) => card.id),
    ])
    render(<EndingReader store={store} />)

    expect(screen.getByText('第 1 / 1 頁')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /結局分鏡/ })).toHaveLength(4)
    expect(screen.getByRole('button', { name: '下一頁' })).toBeDisabled()
  })

  it('returns to the builder with the finished arrangement intact', async () => {
    const store = await completeRoute(episode.perfectFingerprint)
    const before = store.getState().slots
    const user = userEvent.setup()
    render(<EndingReader store={store} />)

    await user.click(screen.getByRole('button', { name: '回到編排' }))

    expect(store.getState().screen).toBe('builder')
    expect(store.getState().slots).toEqual(before)
  })
})
