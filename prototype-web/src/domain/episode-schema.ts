import { z } from 'zod'

const cardKindSchema = z.enum(['character', 'scene', 'prop'])

const comicCardSchema = z.object({
  id: z.string().trim().min(1),
  kind: cardKindSchema,
  title: z.string().trim().min(1),
  shortLabel: z.string().trim().min(1),
  artId: z.string().trim().min(1),
  line: z.string().trim().min(1),
  characterId: z.string().trim().min(1).optional(),
}).strict()

const dialoguePairSchema = z.tuple([
  z.string().trim().min(1),
  z.string().trim().min(1),
])

const endingFrameSchema = z.object({
  artId: z.string().trim().min(1),
  lines: z.array(z.string().trim().min(1)).min(1).max(3),
}).strict()

const fourEndingFramesSchema = z.tuple([
  endingFrameSchema,
  endingFrameSchema,
  endingFrameSchema,
  endingFrameSchema,
])

const directedSideRouteSchema = z.object({
  id: z.string().trim().min(1),
  leadCharacterId: z.string().trim().min(1),
  partnerCharacterId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  pairDialogue: dialoguePairSchema,
  revealDialogue: dialoguePairSchema,
  revealArtId: z.string().trim().min(1),
  endingSequenceId: z.string().trim().min(1),
}).strict()

const officeEpisodeSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal('office-comic-episode-01'),
  title: z.string().trim().min(1),
  fixedOpeningArtId: z.string().trim().min(1),
  cards: z.array(comicCardSchema).length(13),
  perfectFingerprint: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
  perfectEnding: z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    revealDialogue: dialoguePairSchema,
    revealArtId: z.string().trim().min(1),
    endingFrames: z.tuple([
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
      endingFrameSchema,
    ]),
  }).strict(),
  sideRoutes: z.array(directedSideRouteSchema).length(20),
  sideEndings: z.array(z.object({
    id: z.string().trim().min(1),
    frames: fourEndingFramesSchema,
  }).strict()).length(10),
}).strict().superRefine((episode, context) => {
  const cardIds = episode.cards.map((card) => card.id)
  if (new Set(cardIds).size !== cardIds.length) {
    context.addIssue({
      code: 'custom',
      message: 'card ids must be unique',
      path: ['cards'],
    })
  }

  const counts = {
    character: 0,
    scene: 0,
    prop: 0,
  }
  for (const card of episode.cards) {
    counts[card.kind] += 1
    if (card.kind === 'character' && !card.characterId) {
      context.addIssue({
        code: 'custom',
        message: 'character cards require characterId',
        path: ['cards', cardIds.indexOf(card.id), 'characterId'],
      })
    }
    if (card.kind !== 'character' && card.characterId) {
      context.addIssue({
        code: 'custom',
        message: 'only character cards may define characterId',
        path: ['cards', cardIds.indexOf(card.id), 'characterId'],
      })
    }
  }
  if (
    counts.character !== 5
    || counts.scene !== 4
    || counts.prop !== 4
  ) {
    context.addIssue({
      code: 'custom',
      message: 'cards must contain 5 characters, 4 scenes, and 4 props',
      path: ['cards'],
    })
  }

  const fingerprint = episode.perfectFingerprint
  if (new Set(fingerprint).size !== fingerprint.length) {
    context.addIssue({
      code: 'custom',
      message: 'perfect fingerprint card ids must be unique',
      path: ['perfectFingerprint'],
    })
  }
  for (const cardId of fingerprint) {
    if (!cardIds.includes(cardId)) {
      context.addIssue({
        code: 'custom',
        message: `perfect fingerprint contains unknown card: ${cardId}`,
        path: ['perfectFingerprint'],
      })
    }
  }

  const characterIds = episode.cards
    .flatMap((card) => card.characterId ? [card.characterId] : [])
  if (new Set(characterIds).size !== 5) {
    context.addIssue({
      code: 'custom',
      message: 'character ids must be unique',
      path: ['cards'],
    })
  }

  const expectedPairs = new Set(
    characterIds.flatMap((lead) =>
      characterIds
        .filter((partner) => partner !== lead)
        .map((partner) => `${lead}->${partner}`),
    ),
  )
  const routeIds = episode.sideRoutes.map((route) => route.id)
  const actualPairs = episode.sideRoutes.map(
    (route) => `${route.leadCharacterId}->${route.partnerCharacterId}`,
  )

  if (
    new Set(routeIds).size !== routeIds.length
    || new Set(actualPairs).size !== expectedPairs.size
    || actualPairs.some((pair) => !expectedPairs.has(pair))
  ) {
    context.addIssue({
      code: 'custom',
      message: 'sideRoutes must define all 20 directed character pairs',
      path: ['sideRoutes'],
    })
  }

  const sideEndingIds = episode.sideEndings.map((ending) => ending.id)
  if (new Set(sideEndingIds).size !== sideEndingIds.length) {
    context.addIssue({
      code: 'custom',
      message: 'side ending ids must be unique',
      path: ['sideEndings'],
    })
  }
  const endingUseCounts = new Map<string, number>()
  for (const route of episode.sideRoutes) {
    endingUseCounts.set(
      route.endingSequenceId,
      (endingUseCounts.get(route.endingSequenceId) ?? 0) + 1,
    )
    if (!sideEndingIds.includes(route.endingSequenceId)) {
      context.addIssue({
        code: 'custom',
        message: `unknown side ending: ${route.endingSequenceId}`,
        path: ['sideRoutes'],
      })
    }
  }
  if (
    sideEndingIds.some((endingId) => endingUseCounts.get(endingId) !== 2)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'each side ending must be shared by both route directions',
      path: ['sideEndings'],
    })
  }
})

const assetDefinitionSchema = z.object({
  id: z.string().trim().min(1),
  category: z.enum([
    'character-sheet',
    'card-character',
    'card-scene',
    'card-prop',
    'opening',
    'perfect-reveal',
    'perfect-ending',
    'side-reveal',
    'side-ending',
    'ui',
  ]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict()

const assetPlanSchema = z.object({
  schemaVersion: z.literal(1),
  assets: z.array(assetDefinitionSchema).length(87),
}).strict().superRefine((plan, context) => {
  const ids = plan.assets.map((asset) => asset.id)
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: 'custom',
      message: 'asset ids must be unique',
      path: ['assets'],
    })
  }
})

export type CardKind = z.infer<typeof cardKindSchema>
export type ComicCard = z.infer<typeof comicCardSchema>
export type DirectedSideRoute = z.infer<typeof directedSideRouteSchema>
export type OfficeEpisode = z.infer<typeof officeEpisodeSchema>
export type AssetPlan = z.infer<typeof assetPlanSchema>

export function parseOfficeEpisode(input: unknown): OfficeEpisode {
  return officeEpisodeSchema.parse(input)
}

export function parseAssetPlan(input: unknown): AssetPlan {
  return assetPlanSchema.parse(input)
}

export function getEpisodeArtIds(episode: OfficeEpisode): string[] {
  return [
    episode.fixedOpeningArtId,
    ...episode.cards.map((card) => card.artId),
    episode.perfectEnding.revealArtId,
    ...episode.perfectEnding.endingFrames.map((frame) => frame.artId),
    ...episode.sideRoutes.map((route) => route.revealArtId),
    ...episode.sideEndings.flatMap(
      (ending) => ending.frames.map((frame) => frame.artId),
    ),
  ]
}

export function validateEpisodeAssets(
  episode: OfficeEpisode,
  assetPlan: AssetPlan,
): void {
  const knownIds = new Set(assetPlan.assets.map((asset) => asset.id))
  const unknownId = getEpisodeArtIds(episode).find((id) => !knownIds.has(id))
  if (unknownId) {
    throw new Error(`Unknown art id: ${unknownId}`)
  }
}
