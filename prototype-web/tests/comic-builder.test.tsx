import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createComicStore } from '@/app/store'
import { ComicBuilderScreen } from '@/components/ComicBuilderScreen'
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

async function renderBuilder(selectedEpisode = episode) {
  const store = createComicStore({
    storage,
    loadEpisode: async () => selectedEpisode,
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
  it('shows four player slots, two hints, and the locked final panel', async () => {
    await renderBuilder()

    expect(screen.getByRole('img', { name: '固定開場分鏡' }))
      .toBeInTheDocument()
    for (const label of ['第一格', '第二格', '第三格', '第四格']) {
      expect(screen.getByRole('group', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('第六格尚未揭露')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /空格/ })).toHaveLength(4)
    expect(screen.getByText('0 / 4 張卡')).toBeInTheDocument()
    expect(screen.getByText('主線似乎需要兩名人物'))
      .toBeInTheDocument()
    expect(screen.getByText('再放入一個場景與一件關鍵物品'))
      .toBeInTheDocument()
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

  it('allows any card kind in either hinted slot', async () => {
    const { store } = await renderBuilder()

    act(() => {
      store.getState().placeCard('card_scene_glass_meeting_room', 0)
      store.getState().placeCard('card_char_changli', 2)
    })

    expect(screen.getByRole('button', {
      name: '第 1 格：玻璃會議室',
    })).toBeInTheDocument()
    expect(screen.getByRole('button', {
      name: '第 3 格：長離',
    })).toBeInTheDocument()
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
      '至少需要兩名人物。先從牌庫選兩個人，再調整格子順序。',
    )
    expect(store.getState().slots.every(Boolean)).toBe(true)
  })

  it('asks for at least two characters when only one is selected', async () => {
    const { store, user } = await renderBuilder()
    act(() => {
      [
        'card_char_male_rover',
        'card_scene_glass_meeting_room',
        'card_scene_boss_office',
        'card_prop_master_keycard',
      ].forEach((cardId, index) => {
        store.getState().placeCard(cardId, index)
      })
    })

    await user.click(screen.getByRole('button', { name: '演下去' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '至少需要兩名人物。請再選一名人物，或調整格子順序。',
    )
  })

  it('shows a controlled message when directed route data is missing', async () => {
    const incompleteEpisode = {
      ...episode,
      sideRoutes: episode.sideRoutes.filter(
        (route) => route.id !== 'side-male-rover-changli',
      ),
    }
    const { store, user } = await renderBuilder(incompleteEpisode)
    act(() => {
      [
        'card_char_male_rover',
        'card_char_changli',
        'card_scene_glass_meeting_room',
        'card_prop_master_keycard',
      ].forEach((cardId, index) => {
        store.getState().placeCard(cardId, index)
      })
    })

    await user.click(screen.getByRole('button', { name: '演下去' }))

    expect(screen.getByRole('status')).toHaveTextContent(
      '這組人物的支線資料缺漏，請更換人物或調整順序。',
    )
  })
})
