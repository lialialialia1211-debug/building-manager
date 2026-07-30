import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseOfficeEpisode } from '@/domain/episode-schema'
import { resolveRoute } from '@/domain/route-resolver'

const episode = parseOfficeEpisode(JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-comic/office-episode.json'),
  'utf8',
)) as unknown)

function characterCardId(characterId: string): string {
  const card = episode.cards.find(
    (candidate) => candidate.characterId === characterId,
  )
  if (!card) throw new Error(`missing character fixture: ${characterId}`)
  return card.id
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [[...values]]
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidateIndex) => candidateIndex !== index))
      .map((tail) => [value, ...tail]),
  )
}

describe('resolveRoute', () => {
  it('recognizes all 24 orders of the perfect four-card set', () => {
    const arrangements = permutations(episode.perfectFingerprint)

    expect(arrangements).toHaveLength(24)
    for (const slots of arrangements) {
      expect(resolveRoute(slots, episode)).toEqual({
        kind: 'perfect',
        routeId: 'perfect-locked-door',
      })
    }
  })

  it.each(episode.sideRoutes)(
    'resolves directed route $id from the first two characters in slot order',
    (route) => {
      const slots = [
        characterCardId(route.leadCharacterId),
        'card_scene_glass_meeting_room',
        characterCardId(route.partnerCharacterId),
        'card_prop_master_keycard',
      ]

      expect(resolveRoute(slots, episode)).toEqual({
        kind: 'side',
        routeId: route.id,
        leadCharacterId: route.leadCharacterId,
        partnerCharacterId: route.partnerCharacterId,
      })
    },
  )

  it('uses only the first two characters when three or four are selected', () => {
    expect(resolveRoute([
      characterCardId('changli'),
      characterCardId('xiangli-yao'),
      characterCardId('female-rover'),
      'card_prop_master_keycard',
    ], episode)).toMatchObject({
      kind: 'side',
      routeId: 'side-changli-xiangli-yao',
      leadCharacterId: 'changli',
      partnerCharacterId: 'xiangli-yao',
    })

    expect(resolveRoute([
      characterCardId('aleph-one'),
      characterCardId('male-rover'),
      characterCardId('changli'),
      characterCardId('xiangli-yao'),
    ], episode)).toMatchObject({
      kind: 'side',
      routeId: 'side-aleph-one-male-rover',
      leadCharacterId: 'aleph-one',
      partnerCharacterId: 'male-rover',
    })
  })

  it('changes the directed route when the first two characters are reversed', () => {
    const forward = resolveRoute([
      characterCardId('male-rover'),
      characterCardId('changli'),
      'card_scene_glass_meeting_room',
      'card_prop_master_keycard',
    ], episode)
    const reversed = resolveRoute([
      characterCardId('changli'),
      characterCardId('male-rover'),
      'card_scene_glass_meeting_room',
      'card_prop_master_keycard',
    ], episode)

    expect(forward).toMatchObject({ routeId: 'side-male-rover-changli' })
    expect(reversed).toMatchObject({ routeId: 'side-changli-male-rover' })
  })

  it('rejects an incomplete arrangement', () => {
    expect(resolveRoute(
      [...episode.perfectFingerprint.slice(0, 3), null],
      episode,
    )).toEqual({ kind: 'invalid', reason: 'incomplete' })
  })

  it('rejects unknown cards before route matching', () => {
    expect(resolveRoute(
      [...episode.perfectFingerprint.slice(0, 3), 'card_unknown'],
      episode,
    )).toEqual({ kind: 'invalid', reason: 'unknown-card' })
  })

  it('rejects duplicate cards before route matching', () => {
    expect(resolveRoute([
      episode.perfectFingerprint[0],
      episode.perfectFingerprint[1],
      episode.perfectFingerprint[2],
      episode.perfectFingerprint[0],
    ], episode)).toEqual({ kind: 'invalid', reason: 'duplicate-card' })
  })

  it('rejects only arrangements with fewer than two character cards', () => {
    const nonCharacters = episode.cards
      .filter((card) => card.kind !== 'character')
      .map((card) => card.id)

    expect(resolveRoute(nonCharacters.slice(0, 4), episode)).toEqual({
      kind: 'invalid',
      reason: 'character-count',
      characterCount: 0,
    })
    expect(resolveRoute([
      characterCardId('female-rover'),
      ...nonCharacters.slice(0, 3),
    ], episode)).toEqual({
      kind: 'invalid',
      reason: 'character-count',
      characterCount: 1,
    })
  })

  it('returns a controlled error when directed route data is missing', () => {
    const route = episode.sideRoutes.find(
      (candidate) =>
        candidate.leadCharacterId === 'male-rover'
        && candidate.partnerCharacterId === 'changli',
    )
    if (!route) throw new Error('missing route fixture')
    const incompleteEpisode = {
      ...episode,
      sideRoutes: episode.sideRoutes.filter(
        (candidate) => candidate.id !== route.id,
      ),
    }

    expect(resolveRoute([
      characterCardId('male-rover'),
      characterCardId('changli'),
      'card_scene_glass_meeting_room',
      'card_prop_master_keycard',
    ], incompleteEpisode)).toEqual({
      kind: 'invalid',
      reason: 'route-data',
    })
  })
})
