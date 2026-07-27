import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createComicStore } from '@/app/store'
import { ComicBuilderScreen } from '@/components/ComicBuilderScreen'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import type { StorageAdapter } from '@/domain/persistence'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-episode.json'),
  'utf8',
)) as unknown)

const storage: StorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
}

async function renderBuilder() {
  const store = createComicStore({
    storage,
    loadEpisode: async () => episode,
  })
  await act(async () => {
    await store.getState().initialize()
  })
  act(() => {
    store.getState().confirmAge()
  })
  const user = userEvent.setup()
  render(<ComicBuilderScreen store={store} />)
  return { store, user }
}

describe('ComicBuilderScreen', () => {
  it('shows the opening, four slot groups, and locked final panel', async () => {
    await renderBuilder()

    expect(screen.getByRole('img', { name: '固定開場分鏡' }))
      .toBeInTheDocument()
    for (const label of ['第一幕', '第二幕', '第三幕', '第四幕']) {
      expect(screen.getByRole('group', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('第六格尚未揭露')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /空格/ })).toHaveLength(8)
  })

  it('filters the 5 / 4 / 4 tray and prevents reused cards', async () => {
    const { user } = await renderBuilder()
    const tray = screen.getByRole('region', { name: '故事卡牌' })

    expect(within(tray).getAllByRole('button', { name: /^加入/ }))
      .toHaveLength(5)

    await user.click(within(tray).getByRole('button', {
      name: '加入男漂泊者',
    }))
    expect(within(tray).getByRole('button', {
      name: '男漂泊者已放入',
    })).toBeDisabled()

    await user.click(within(tray).getByRole('tab', { name: '場景 4' }))
    expect(within(tray).getAllByRole('button', { name: /^加入/ }))
      .toHaveLength(4)

    await user.click(within(tray).getByRole('tab', { name: '道具 4' }))
    expect(within(tray).getAllByRole('button', { name: /^加入/ }))
      .toHaveLength(4)
  })

  it('supports keyboard placement, removal, and submission readiness', async () => {
    const { store, user } = await renderBuilder()
    const submit = screen.getByRole('button', { name: '演下去' })
    expect(submit).toBeDisabled()

    const firstCard = screen.getByRole('button', { name: '加入男漂泊者' })
    firstCard.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: '第 1 格：男漂泊者' }))
      .toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '移除第 1 格' }))
    expect(screen.getByRole('button', { name: '第 1 格：空格' }))
      .toBeInTheDocument()

    act(() => {
      episode.perfectFingerprint.forEach((cardId, index) => {
        store.getState().placeCard(cardId, index)
      })
    })
    expect(submit).toBeEnabled()
  })

  it('announces invalid feedback while preserving every slot', async () => {
    const { store, user } = await renderBuilder()
    const nonCharacters = episode.cards.filter(
      (card) => card.kind !== 'character',
    )
    act(() => {
      nonCharacters.forEach((card, index) => {
        store.getState().placeCard(card.id, index)
      })
    })

    await user.click(screen.getByRole('button', { name: '演下去' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '只有辦公室和道具，沒人演。重排。',
    )
    expect(store.getState().slots.every(Boolean)).toBe(true)
  })
})
