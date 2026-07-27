import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('RevealSequence', () => {
  it('reveals panels two through five in order, then unlocks panel six', async () => {
    const store = await createRevealStore()
    const user = userEvent.setup()
    render(<RevealSequence store={store} />)

    expect(screen.getAllByText('尚未揭露')).toHaveLength(4)

    for (let panel = 2; panel <= 5; panel += 1) {
      await user.click(screen.getByRole('button', {
        name: `揭露第 ${panel} 格`,
      }))
      expect(screen.getByRole('group', {
        name: `第 ${panel} 格已揭露`,
      })).toBeInTheDocument()
    }

    expect(screen.getByRole('img', { name: '第六格結局分鏡' }))
      .toBeInTheDocument()
    expect(screen.getByText('你真的想我放開？', { exact: false }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '閱讀結局' }))
    expect(store.getState().screen).toBe('ending')
  })

  it('returns to the builder without changing the arrangement', async () => {
    const store = await createRevealStore()
    const before = store.getState().slots
    const user = userEvent.setup()
    render(<RevealSequence store={store} />)

    await user.click(screen.getByRole('button', { name: '回去重排' }))

    expect(store.getState().screen).toBe('builder')
    expect(store.getState().slots).toEqual(before)
  })
})
