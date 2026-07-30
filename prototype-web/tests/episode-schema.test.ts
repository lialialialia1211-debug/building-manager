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

const rawEpisode = readJson('../../content/office-comic/office-episode.json')
const rawAssetPlan = readJson('../../content/office-comic/office-asset-plan.json')

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
    expect(episode.perfectFingerprint).toEqual([
      'card_char_male_rover',
      'card_char_changli',
      'card_scene_boss_office',
      'card_prop_merger_contract',
    ])
    expect(episode.sideRoutes).toHaveLength(20)
    expect(directedPairs.size).toBe(20)
    expect(episode.perfectEnding.endingFrames).toHaveLength(12)
    expect(episode.sideEndings).toHaveLength(10)
    expect(new Set(episode.sideEndings.map((ending) => ending.id)).size)
      .toBe(10)
    for (const route of episode.sideRoutes) {
      expect(route.pairDialogue).toHaveLength(2)
      expect(route.revealDialogue).toHaveLength(2)
      expect(episode.sideEndings.some(
        (ending) => ending.id === route.endingSequenceId,
      )).toBe(true)
    }
    for (const frame of [
      ...episode.perfectEnding.endingFrames,
      ...episode.sideEndings.flatMap((ending) => ending.frames),
    ]) {
      expect(frame.lines.length).toBeGreaterThanOrEqual(1)
      expect(frame.lines.length).toBeLessThanOrEqual(3)
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

  it('preserves approved comic dialogue separately for each story layer', () => {
    const episode = parseOfficeEpisode(rawEpisode)
    const route = episode.sideRoutes.find(
      (candidate) => candidate.id === 'side-male-rover-female-rover',
    )
    const ending = episode.sideEndings.find(
      (candidate) => candidate.id === 'male-rover-female-rover',
    )

    expect(route?.pairDialogue).toEqual([
      '男：「今晚別跟我搶。」',
      '女：「看你本事。」',
    ])
    expect(route?.revealDialogue).toEqual([
      '女漂泊者：「這些錯頁明早一定被發現。」',
      '男漂泊者：「那就先鎖門。」',
    ])
    expect(ending?.frames[0]?.lines).toEqual([
      '女漂泊者：「鎖門是為了藏文件？」',
      '男漂泊者：「一半。另一半是妳。」',
      '女漂泊者：「那就過來。」',
    ])
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
