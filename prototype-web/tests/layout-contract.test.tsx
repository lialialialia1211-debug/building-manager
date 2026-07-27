import { act, render, screen } from '@testing-library/react'
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

describe('responsive layout contract', () => {
  it('exposes the builder status, page, tray, controls, and four acts', async () => {
    const storage: StorageAdapter = {
      getItem: () => null,
      setItem: () => undefined,
    }
    const store = createComicStore({
      storage,
      loadEpisode: async () => episode,
    })
    await act(async () => {
      await store.getState().initialize()
    })
    render(<ComicBuilderScreen store={store} />)

    expect(screen.getByRole('banner', { name: '劇集狀態' }))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: '漫畫分鏡' }))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: '故事卡牌' }))
      .toBeInTheDocument()
    expect(screen.getByRole('region', { name: '編排操作' }))
      .toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: /第[一二三四]幕/ }))
      .toHaveLength(4)
  })
})
