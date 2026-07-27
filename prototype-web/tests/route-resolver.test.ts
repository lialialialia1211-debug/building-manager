import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import { resolveRoute } from '@/domain/route-resolver'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-comic/office-episode.json'),
  'utf8',
)) as unknown)

const sideFillers = [
  'card_scene_glass_meeting_room',
  'card_scene_copy_archive_room',
  'card_prop_master_keycard',
  'card_prop_merger_contract',
  'card_prop_blind_remote',
  'card_prop_whisky_set',
] as const

function characterCardId(characterId: string): string {
  const card = episode.cards.find(
    (candidate) => candidate.characterId === characterId,
  )
  if (!card) throw new Error(`missing character fixture: ${characterId}`)
  return card.id
}

describe('resolveRoute', () => {
  it('recognizes only the exact ordered perfect fingerprint as perfect', () => {
    expect(resolveRoute(episode.perfectFingerprint, episode)).toEqual({
      kind: 'perfect',
      routeId: 'perfect-locked-door',
    })

    const reordered = [...episode.perfectFingerprint]
    ;[reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!]

    expect(resolveRoute(reordered, episode)).toMatchObject({
      kind: 'side',
      routeId: 'side-changli-male-rover',
    })
  })

  it.each(episode.sideRoutes)(
    'resolves directed route $id from the first character in slot order',
    (route) => {
      const slots = [
        characterCardId(route.leadCharacterId),
        sideFillers[0],
        sideFillers[1],
        characterCardId(route.partnerCharacterId),
        ...sideFillers.slice(2),
      ]

      expect(resolveRoute(slots, episode)).toEqual({
        kind: 'side',
        routeId: route.id,
        leadCharacterId: route.leadCharacterId,
        partnerCharacterId: route.partnerCharacterId,
      })
    },
  )

  it('rejects an incomplete arrangement', () => {
    expect(resolveRoute(
      [...episode.perfectFingerprint.slice(0, 7), null],
      episode,
    )).toEqual({ kind: 'invalid', reason: 'incomplete' })
  })

  it('rejects unknown cards before route matching', () => {
    expect(resolveRoute(
      [...episode.perfectFingerprint.slice(0, 7), 'card_unknown'],
      episode,
    )).toEqual({ kind: 'invalid', reason: 'unknown-card' })
  })

  it('rejects duplicate cards before route matching', () => {
    expect(resolveRoute(
      [...episode.perfectFingerprint.slice(0, 7), episode.perfectFingerprint[0]],
      episode,
    )).toEqual({ kind: 'invalid', reason: 'duplicate-card' })
  })

  it('rejects arrangements without exactly two character cards', () => {
    const nonCharacters = episode.cards
      .filter((card) => card.kind !== 'character')
      .map((card) => card.id)
    const threeCharacters = episode.cards
      .filter((card) => card.kind === 'character')
      .slice(0, 3)
      .map((card) => card.id)

    expect(resolveRoute(nonCharacters, episode)).toEqual({
      kind: 'invalid',
      reason: 'character-count',
      characterCount: 0,
    })
    expect(resolveRoute(
      [...threeCharacters, ...nonCharacters.slice(0, 5)],
      episode,
    )).toEqual({
      kind: 'invalid',
      reason: 'character-count',
      characterCount: 3,
    })
  })
})
