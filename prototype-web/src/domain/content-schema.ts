import { z } from 'zod'
import type {
  CharacterDefinition,
  GalleryEntry,
  RoomDefinition,
} from './types'

const statNameSchema = z.enum(['affection', 'trust', 'intimacy'])
const endingIdSchema = z.enum(['main', 'normal', 'intimacy'])
const dialogueSchema = z.array(
  z.string().trim().min(1),
).min(1)

const conditionsSchema = z.object({
  allFlags: z.array(z.string()).optional(),
  noneFlags: z.array(z.string()).optional(),
  minimumStats: z.partialRecord(statNameSchema, z.number().int()).optional(),
})

const panelSchema = z.object({
  next: z.string().min(1),
  previewAsset: z.string().min(1),
  actionLabel: z.string().trim().min(1),
  artBrief: z.string().trim().min(60).optional(),
  fullAsset: z.string().optional(),
  safeAsset: z.string().optional(),
  dialogue: dialogueSchema,
  dialogueVariants: z.record(
    z.string(),
    dialogueSchema,
  ).optional(),
  dialogueVariant: z.string().optional(),
  effects: z.partialRecord(statNameSchema, z.number().int()).optional(),
  setFlags: z.array(z.string()).optional(),
  conditions: conditionsSchema.optional(),
  motion: z.enum(['standard', 'hero']).optional(),
})

const endingContentSchema = z.object({
  title: z.string(),
  asset: z.string(),
  clueIds: z.array(z.string()),
  galleryUnlocks: z.array(z.string()),
  dialogue: dialogueSchema.optional(),
  artBrief: z.string().trim().min(60).optional(),
})

const roomSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  startNode: z.string().min(1),
  alternateStartNodes: z.record(z.string(), z.string()).optional(),
  safeNode: z.string().min(1),
  endingAnchor: z.string().min(1),
  drafting: z.object({
    dealSize: z.literal(12),
    selectionSize: z.literal(6),
    requiredDealPanels: z.array(z.string().trim().min(1)).optional(),
  }).optional(),
  openingDialogue: dialogueSchema.optional(),
  nodes: z.record(
    z.string(),
    z.object({
      candidates: z
        .array(z.string())
        .length(3, 'exactly 3 candidates'),
    }),
  ),
  panels: z.record(z.string(), panelSchema),
  endingRules: z
    .array(
      z.object({
        id: endingIdSchema,
        priority: z.number().int(),
        conditions: conditionsSchema,
      }),
    )
    .length(3),
  endingContent: z.record(endingIdSchema, endingContentSchema),
}).superRefine((room, context) => {
  if (!room.drafting) return

  const panelIds = Object.keys(room.panels)
  if (panelIds.length < room.drafting.dealSize) {
    context.addIssue({
      code: 'custom',
      message: 'drafting rooms require at least 12 panels',
      path: ['panels'],
    })
  }

  const requiredPanels = room.drafting.requiredDealPanels ?? []
  if (new Set(requiredPanels).size !== requiredPanels.length) {
    context.addIssue({
      code: 'custom',
      message: 'requiredDealPanels must be unique',
      path: ['drafting', 'requiredDealPanels'],
    })
  }
  for (const panelId of requiredPanels) {
    if (!room.panels[panelId]) {
      context.addIssue({
        code: 'custom',
        message: `required deal panel ${panelId} is missing`,
        path: ['drafting', 'requiredDealPanels'],
      })
    }
  }

  if (textLength(room.openingDialogue) < 600) {
    context.addIssue({
      code: 'custom',
      message: 'openingDialogue must contain at least 600 characters',
      path: ['openingDialogue'],
    })
  }

  for (const [panelId, panel] of Object.entries(room.panels)) {
    if (!panel.artBrief) {
      context.addIssue({
        code: 'custom',
        message: 'drafting panels require artBrief',
        path: ['panels', panelId, 'artBrief'],
      })
    }
    if (textLength(panel.dialogue) < 260) {
      context.addIssue({
        code: 'custom',
        message: 'drafting panel dialogue must contain at least 260 characters',
        path: ['panels', panelId, 'dialogue'],
      })
    }
  }

  for (const [endingId, ending] of Object.entries(room.endingContent)) {
    if (!ending.artBrief) {
      context.addIssue({
        code: 'custom',
        message: 'drafting endings require artBrief',
        path: ['endingContent', endingId, 'artBrief'],
      })
    }
    if (textLength(ending.dialogue) < 350) {
      context.addIssue({
        code: 'custom',
        message: 'drafting ending dialogue must contain at least 350 characters',
        path: ['endingContent', endingId, 'dialogue'],
      })
    }
  }
})

function textLength(lines: string[] | undefined): number {
  return (lines ?? []).join('').replace(/\s/g, '').length
}

const charactersSchema = z.array(
  z.object({
    id: z.string(),
    displayName: z.string(),
    age: z.number().int().min(18),
    ageStatus: z.literal('adult'),
    roomId: z.string(),
  }),
)

const supportedGalleryCombinations = new Set([
  'room_a_blackout::main',
  'room_a_blackout::normal',
  'room_a_blackout::intimacy',
  'room_b_wall::main',
  'room_b_wall::normal',
  'room_b_wall::intimacy',
])
const canonicalGalleryIds = {
  room_a_blackout: {
    main: 'room_a_main',
    normal: 'room_a_normal',
    intimacy: 'room_a_intimacy',
  },
  room_b_wall: {
    main: 'room_b_main',
    normal: 'room_b_normal',
    intimacy: 'room_b_intimacy',
  },
} as const
const gallerySequenceSchema = z.array(
  z.string().trim().min(1),
).length(6)
const galleryEntrySchema = z.object({
  id: z.string().trim().min(1),
  roomId: z.enum(['room_a_blackout', 'room_b_wall']),
  endingId: endingIdSchema,
  adult: z.boolean(),
  adultSequence: gallerySequenceSchema.optional(),
  safeSequence: gallerySequenceSchema.optional(),
}).strict().superRefine((entry, context) => {
  const canonicalId =
    canonicalGalleryIds[entry.roomId][entry.endingId]
  if (entry.id !== canonicalId) {
    context.addIssue({
      code: 'custom',
      message: `gallery id must be ${canonicalId}`,
    })
  }

  if (entry.endingId === 'intimacy') {
    if (!entry.adult) {
      context.addIssue({
        code: 'custom',
        message: 'intimacy entries must be adult',
      })
    }
    if (!entry.adultSequence || !entry.safeSequence) {
      context.addIssue({
        code: 'custom',
        message: 'intimacy entries require adult and safe sequences',
      })
      return
    }
    if (entry.adultSequence.length !== entry.safeSequence.length) {
      context.addIssue({
        code: 'custom',
        message: 'adult and safe sequences must align',
      })
    }
    return
  }

  if (entry.adult) {
    context.addIssue({
      code: 'custom',
      message: 'main and normal entries must not be adult',
    })
  }
  if (entry.adultSequence || entry.safeSequence) {
    context.addIssue({
      code: 'custom',
      message: 'main and normal entries must not define sequences',
    })
  }
})
const gallerySchema = z.array(galleryEntrySchema).length(6).superRefine(
  (entries, context) => {
    const ids = new Set(entries.map((entry) => entry.id))
    if (ids.size !== entries.length) {
      context.addIssue({
        code: 'custom',
        message: 'gallery ids must be unique',
      })
    }

    const combinations = entries.map(
      (entry) => `${entry.roomId}::${entry.endingId}`,
    )
    if (
      new Set(combinations).size !== supportedGalleryCombinations.size
      || combinations.some(
        (combination) =>
          !supportedGalleryCombinations.has(combination),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'gallery must define all six supported endings',
      })
    }
  },
)

export function parseRoom(value: unknown): RoomDefinition {
  return roomSchema.parse(value) as RoomDefinition
}

export function parseCharacters(value: unknown): CharacterDefinition[] {
  return charactersSchema.parse(value) as CharacterDefinition[]
}

export function parseGallery(value: unknown): GalleryEntry[] {
  return gallerySchema.parse(value) as GalleryEntry[]
}
