import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildRevealPanels,
  getRoutePresentation,
} from '@/domain/dialogue'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import { resolveRoute } from '@/domain/route-resolver'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-episode.json'),
  'utf8',
)) as unknown)

const sideFillers = episode.cards
  .filter((card) => card.kind !== 'character')
  .slice(0, 6)
  .map((card) => card.id)

function cardIdForCharacter(characterId: string): string {
  const card = episode.cards.find(
    (candidate) => candidate.characterId === characterId,
  )
  if (!card) throw new Error(`missing card for ${characterId}`)
  return card.id
}

describe('dynamic comic dialogue', () => {
  it('limits every reveal grid to at most two text lines', () => {
    const arrangements = [
      episode.perfectFingerprint,
      ...episode.sideRoutes.map((route) => [
        cardIdForCharacter(route.leadCharacterId),
        sideFillers[0]!,
        cardIdForCharacter(route.partnerCharacterId),
        ...sideFillers.slice(1),
      ]),
    ]

    for (const arrangement of arrangements) {
      const panels = buildRevealPanels(arrangement, episode)
      expect(panels).toHaveLength(4)
      expect(panels.every((panel) => panel.lines.length <= 2)).toBe(true)
      expect(panels.every((panel) => panel.lines.length >= 1)).toBe(true)
    }
  })

  it.each(episode.sideRoutes)(
    'uses the approved directed exchange for $id',
    (route) => {
      const resolution = resolveRoute([
        cardIdForCharacter(route.leadCharacterId),
        cardIdForCharacter(route.partnerCharacterId),
        ...sideFillers,
      ], episode)

      expect(getRoutePresentation(resolution, episode)).toMatchObject({
        title: route.title,
        revealDialogue: route.dialogue,
        revealArtId: route.revealArtId,
      })
    },
  )

  it('uses character speech plus the first non-character narration', () => {
    const lines = buildRevealPanels([
      'card_char_female_rover',
      'card_prop_master_keycard',
      'card_scene_boss_office',
      ...episode.cards.slice(0, 5).map((card) => card.id),
    ], episode)[0]?.lines

    expect(lines).toEqual([
      '女漂泊者：「別把有趣的事都搶走。」',
      '旁白：「嗶。最高權限通過。」',
    ])
  })
})
