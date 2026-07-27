import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  parseAssetPlan,
  parseOfficeEpisode,
  validateEpisodeAssets,
} from '@/domain/episode-schema'

function readJson(relativePath: string): unknown {
  const path = fileURLToPath(new URL(relativePath, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

const rawEpisode = readJson('../../content/office-episode.json')
const rawAssetPlan = readJson('../../content/office-asset-plan.json')

describe('office episode schema', () => {
  it('accepts the checked-in episode and complete directed route matrix', () => {
    const episode = parseOfficeEpisode(rawEpisode)
    const assetPlan = parseAssetPlan(rawAssetPlan)
    const cardCounts = episode.cards.reduce<Record<string, number>>(
      (counts, card) => ({
        ...counts,
        [card.kind]: (counts[card.kind] ?? 0) + 1,
      }),
      {},
    )
    const directedPairs = new Set(
      episode.sideRoutes.map(
        (route) => `${route.leadCharacterId}->${route.partnerCharacterId}`,
      ),
    )

    expect(episode.cards).toHaveLength(13)
    expect(cardCounts).toEqual({ character: 5, scene: 4, prop: 4 })
    expect(new Set(episode.cards.map((card) => card.id)).size).toBe(13)
    expect(episode.perfectFingerprint).toHaveLength(8)
    expect(new Set(episode.perfectFingerprint).size).toBe(8)
    expect(episode.sideRoutes).toHaveLength(20)
    expect(directedPairs.size).toBe(20)
    expect(episode.perfectEnding.endingArtIds).toHaveLength(12)
    for (const route of episode.sideRoutes) {
      expect(route.endingArtIds).toHaveLength(4)
      expect(route.dialogue).toHaveLength(2)
    }
    expect(() => validateEpisodeAssets(episode, assetPlan)).not.toThrow()
  })

  it('rejects duplicate card ids', () => {
    const invalid = structuredClone(rawEpisode) as {
      cards: Array<{ id: string }>
    }
    invalid.cards[1]!.id = invalid.cards[0]!.id

    expect(() => parseOfficeEpisode(invalid)).toThrow(/card ids must be unique/i)
  })

  it('rejects an incomplete directed pair matrix', () => {
    const invalid = structuredClone(rawEpisode) as {
      sideRoutes: unknown[]
    }
    invalid.sideRoutes.pop()

    expect(() => parseOfficeEpisode(invalid)).toThrow(
      /all 20 directed character pairs/i,
    )
  })

  it('rejects an episode that references an unknown art id', () => {
    const episode = parseOfficeEpisode(rawEpisode)
    const assetPlan = parseAssetPlan(rawAssetPlan)
    const invalid = {
      ...episode,
      fixedOpeningArtId: 'missing_opening_art',
    }

    expect(() => validateEpisodeAssets(invalid, assetPlan)).toThrow(
      /unknown art id: missing_opening_art/i,
    )
  })
})
