import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildRevealPanels,
  getRoutePresentation,
} from '@/domain/dialogue'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import { resolveRoute } from '@/domain/route-resolver'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-comic/office-episode.json'),
  'utf8',
)) as unknown)

function cardIdForCharacter(characterId: string): string {
  const card = episode.cards.find(
    (candidate) => candidate.characterId === characterId,
  )
  if (!card) throw new Error(`missing card for ${characterId}`)
  return card.id
}

describe('dynamic comic dialogue', () => {
  it('builds exactly one card and one line per reveal panel', () => {
    const slots = [
      cardIdForCharacter('male-rover'),
      'card_scene_glass_meeting_room',
      cardIdForCharacter('changli'),
      'card_prop_master_keycard',
    ]

    const panels = buildRevealPanels(slots, episode)

    expect(panels).toHaveLength(4)
    expect(panels.map((panel) => panel.cardIds)).toEqual(
      slots.map((cardId) => [cardId]),
    )
    expect(panels.every((panel) => panel.lines.length === 1)).toBe(true)
  })

  it.each(episode.sideRoutes)(
    'uses the approved directed presentation for $id',
    (route) => {
      const resolution = resolveRoute([
        cardIdForCharacter(route.leadCharacterId),
        cardIdForCharacter(route.partnerCharacterId),
        'card_scene_glass_meeting_room',
        'card_prop_master_keycard',
      ], episode)

      expect(getRoutePresentation(resolution, episode)).toMatchObject({
        title: route.title,
        revealDialogue: route.revealDialogue,
        revealArtId: route.revealArtId,
      })
    },
  )

  it('uses directed pair dialogue for the first two characters', () => {
    const route = episode.sideRoutes.find(
      (candidate) =>
        candidate.leadCharacterId === 'changli'
        && candidate.partnerCharacterId === 'xiangli-yao',
    )
    if (!route) throw new Error('missing directed dialogue fixture')

    const panels = buildRevealPanels([
      cardIdForCharacter('changli'),
      'card_scene_glass_meeting_room',
      cardIdForCharacter('xiangli-yao'),
      'card_prop_master_keycard',
    ], episode)

    expect(panels[0]?.lines).toEqual([route.pairDialogue[0]])
    expect(panels[2]?.lines).toEqual([route.pairDialogue[1]])
  })

  it('keeps extra characters in the early dialogue without changing the pair', () => {
    const route = episode.sideRoutes.find(
      (candidate) =>
        candidate.leadCharacterId === 'changli'
        && candidate.partnerCharacterId === 'xiangli-yao',
    )
    const extraCard = episode.cards.find(
      (candidate) => candidate.characterId === 'female-rover',
    )
    if (!route || !extraCard) throw new Error('missing dialogue fixture')

    const panels = buildRevealPanels([
      cardIdForCharacter('changli'),
      cardIdForCharacter('xiangli-yao'),
      extraCard.id,
      'card_prop_master_keycard',
    ], episode)

    expect(panels[0]?.lines).toEqual([route.pairDialogue[0]])
    expect(panels[1]?.lines).toEqual([route.pairDialogue[1]])
    expect(panels[2]?.lines).toEqual([extraCard.line])
  })
})
