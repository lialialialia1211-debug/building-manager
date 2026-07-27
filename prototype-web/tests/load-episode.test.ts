import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EpisodeLoadError,
  fetchOfficeEpisode,
} from '@/domain/load-episode'

const episodeJson = readFileSync(
  resolve(process.cwd(), '../content/office-episode.json'),
  'utf8',
)

describe('fetchOfficeEpisode', () => {
  it('loads and validates the office episode', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(episodeJson, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })

    const episode = await fetchOfficeEpisode(undefined, fetcher)

    expect(episode.id).toBe('office-comic-episode-01')
    expect(episode.cards).toHaveLength(13)
  })

  it('reports network failures with a stable error kind', async () => {
    const fetcher: typeof fetch = async () =>
      new Response('unavailable', { status: 503 })

    await expect(fetchOfficeEpisode(undefined, fetcher)).rejects.toMatchObject({
      name: 'EpisodeLoadError',
      kind: 'network',
    } satisfies Partial<EpisodeLoadError>)
  })

  it('reports malformed content with a stable error kind', async () => {
    const fetcher: typeof fetch = async () =>
      Response.json({ schemaVersion: 99 })

    await expect(fetchOfficeEpisode(undefined, fetcher)).rejects.toMatchObject({
      name: 'EpisodeLoadError',
      kind: 'content',
    } satisfies Partial<EpisodeLoadError>)
  })
})
