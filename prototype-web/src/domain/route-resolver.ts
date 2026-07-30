import type { OfficeEpisode } from './episode-schema'

export type InvalidRouteReason =
  | 'incomplete'
  | 'unknown-card'
  | 'duplicate-card'
  | 'character-count'
  | 'route-data'

export type RouteResolution =
  | { kind: 'perfect'; routeId: string }
  | {
    kind: 'side'
    routeId: string
    leadCharacterId: string
    partnerCharacterId: string
  }
  | {
    kind: 'invalid'
    reason: InvalidRouteReason
    characterCount?: number
  }

export function resolveRoute(
  slots: readonly (string | null)[],
  episode: OfficeEpisode,
): RouteResolution {
  if (slots.length !== 4 || slots.some((cardId) => cardId === null)) {
    return { kind: 'invalid', reason: 'incomplete' }
  }

  const cardIds = slots as readonly string[]
  const cardsById = new Map(episode.cards.map((card) => [card.id, card]))
  if (cardIds.some((cardId) => !cardsById.has(cardId))) {
    return { kind: 'invalid', reason: 'unknown-card' }
  }
  if (new Set(cardIds).size !== cardIds.length) {
    return { kind: 'invalid', reason: 'duplicate-card' }
  }

  const perfectCardIds = new Set(episode.perfectFingerprint)
  if (
    cardIds.length === perfectCardIds.size
    && cardIds.every((cardId) => perfectCardIds.has(cardId))
  ) {
    return {
      kind: 'perfect',
      routeId: episode.perfectEnding.id,
    }
  }

  const characterIds = cardIds.flatMap((cardId) => {
    const characterId = cardsById.get(cardId)?.characterId
    return characterId ? [characterId] : []
  })
  if (characterIds.length < 2) {
    return {
      kind: 'invalid',
      reason: 'character-count',
      characterCount: characterIds.length,
    }
  }

  const leadCharacterId = characterIds[0]!
  const partnerCharacterId = characterIds[1]!
  const route = episode.sideRoutes.find(
    (candidate) =>
      candidate.leadCharacterId === leadCharacterId
      && candidate.partnerCharacterId === partnerCharacterId,
  )
  if (!route) {
    return { kind: 'invalid', reason: 'route-data' }
  }

  return {
    kind: 'side',
    routeId: route.id,
    leadCharacterId,
    partnerCharacterId,
  }
}
