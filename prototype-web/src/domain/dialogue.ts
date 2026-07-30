import type { OfficeEpisode } from './episode-schema'
import type { RouteResolution } from './route-resolver'

export interface RevealPanel {
  cardIds: string[]
  lines: string[]
}

export interface RoutePresentation {
  title: string
  revealArtId: string
  revealDialogue: readonly [string, string]
  endingFrames: readonly {
    artId: string
    lines: readonly string[]
  }[]
}

export function buildRevealPanels(
  slots: readonly string[],
  episode: OfficeEpisode,
): RevealPanel[] {
  const cardsById = new Map(episode.cards.map((card) => [card.id, card]))
  const cards = slots.flatMap((cardId) => {
    const card = cardsById.get(cardId)
    return card ? [card] : []
  })
  const characters = cards.filter(
    (card): card is typeof card & { characterId: string } =>
      card.kind === 'character' && Boolean(card.characterId),
  )
  const route = characters.length >= 2
    ? episode.sideRoutes.find(
        (candidate) =>
          candidate.leadCharacterId === characters[0]?.characterId
          && candidate.partnerCharacterId === characters[1]?.characterId,
      )
    : undefined

  return cards.map((card) => {
    let line = card.line
    if (route && card.id === characters[0]?.id) {
      line = route.pairDialogue[0]
    } else if (route && card.id === characters[1]?.id) {
      line = route.pairDialogue[1]
    }
    return {
      cardIds: [card.id],
      lines: [line],
    }
  })
}

export function getRoutePresentation(
  resolution: RouteResolution,
  episode: OfficeEpisode,
): RoutePresentation {
  if (resolution.kind === 'invalid') {
    throw new Error('Invalid arrangements do not have a presentation')
  }
  if (resolution.kind === 'perfect') {
    return {
      title: episode.perfectEnding.title,
      revealArtId: episode.perfectEnding.revealArtId,
      revealDialogue: episode.perfectEnding.revealDialogue,
      endingFrames: episode.perfectEnding.endingFrames,
    }
  }

  const route = episode.sideRoutes.find(
    (candidate) => candidate.id === resolution.routeId,
  )
  if (!route) {
    throw new Error(`Unknown side route: ${resolution.routeId}`)
  }
  const ending = episode.sideEndings.find(
    (candidate) => candidate.id === route.endingSequenceId,
  )
  if (!ending) {
    throw new Error(`Unknown side ending: ${route.endingSequenceId}`)
  }
  return {
    title: route.title,
    revealArtId: route.revealArtId,
    revealDialogue: route.revealDialogue,
    endingFrames: ending.frames,
  }
}
