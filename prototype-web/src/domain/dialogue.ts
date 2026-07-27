import type {
  ComicCard,
  OfficeEpisode,
} from './episode-schema'
import type { RouteResolution } from './route-resolver'

const revealGroups = [
  [0, 1],
  [2],
  [3, 4],
  [5, 6, 7],
] as const

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

  return revealGroups.map((indices) => {
    const cards = indices.flatMap((index) => {
      const card = cardsById.get(slots[index] ?? '')
      return card ? [card] : []
    })
    return {
      cardIds: cards.map((card) => card.id),
      lines: buildPanelLines(cards, episode),
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

function buildPanelLines(
  cards: readonly ComicCard[],
  episode: OfficeEpisode,
): string[] {
  const characters = cards.filter(
    (card): card is ComicCard & { characterId: string } =>
      card.kind === 'character' && Boolean(card.characterId),
  )
  const nonCharacters = cards.filter((card) => card.kind !== 'character')

  if (characters.length >= 2) {
    const route = episode.sideRoutes.find(
      (candidate) =>
        candidate.leadCharacterId === characters[0]?.characterId
        && candidate.partnerCharacterId === characters[1]?.characterId,
    )
    if (route) return [...route.pairDialogue]
  }
  if (characters.length === 1) {
    return [
      characters[0]!.line,
      ...nonCharacters.slice(0, 1).map((card) => card.line),
    ]
  }
  return nonCharacters.slice(0, 2).map((card) => card.line)
}
