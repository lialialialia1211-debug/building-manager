import { z } from 'zod'
import type { EndingId } from './types'

export const PROGRESS_KEY = 'building-manager-progress-v1'
export const PROGRESS_BACKUP_1_KEY =
  'building-manager-progress-v1-backup-1'
export const PROGRESS_BACKUP_2_KEY =
  'building-manager-progress-v1-backup-2'
export const PROGRESS_CORRUPT_KEY =
  'building-manager-progress-v1-corrupt-debug'

export interface ProgressSettings {
  adultContent: boolean
  exactStats: boolean
  autoFastForward: boolean
}

export type EndingRecaps = Record<
  string,
  Partial<Record<EndingId, string[]>>
>

export interface ProgressData {
  version: 1
  currentRun: null | {
    roomId: string
    lockedPanelId?: string
    snapshot?: unknown
  }
  completedEndings: Record<string, Array<'main' | 'normal' | 'intimacy'>>
  endingRecaps: EndingRecaps
  clues: string[]
  galleryUnlocks: string[]
  crossRoomFlags: Record<string, boolean>
  readHistory: Record<string, true>
  settings: ProgressSettings
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

const endingIdSchema = z.enum(['main', 'normal', 'intimacy'])
const endingRecapSchema = z.array(z.string().trim().min(1)).min(1).max(6)
  .refine((panelIds) => new Set(panelIds).size === panelIds.length, {
    message: 'ending recaps must not repeat panel IDs',
  })
const statSnapshotSchema = z.object({
  affection: z.number().finite(),
  trust: z.number().finite(),
  intimacy: z.number().finite(),
}).strict()
const storySnapshotSchema = z.object({
  roomId: z.string().trim().min(1),
  currentNode: z.string().trim().min(1),
  choiceCount: z.number().int().min(0).max(6),
  chosenPanels: z.array(z.string().trim().min(1)).max(6),
  stats: statSnapshotSchema,
  flags: z.record(z.string(), z.boolean()),
}).strict().refine(
  (snapshot) =>
    snapshot.chosenPanels.length === snapshot.choiceCount,
  {
    message: 'chosenPanels must match choiceCount',
    path: ['chosenPanels'],
  },
)
const legacyCurrentRunSchema = z.object({
  roomId: z.string().trim().min(1),
  lockedPanelId: z.string().trim().min(1).optional(),
  snapshot: storySnapshotSchema,
}).strict().superRefine((currentRun, context) => {
  if (currentRun.snapshot.roomId !== currentRun.roomId) {
    context.addIssue({
      code: 'custom',
      message: 'snapshot roomId must match currentRun roomId',
      path: ['snapshot', 'roomId'],
    })
  }
  if (currentRun.snapshot.choiceCount <= 0) {
    context.addIssue({
      code: 'custom',
      message: 'currentRun snapshot must contain a choice',
      path: ['snapshot', 'choiceCount'],
    })
  }
  if (
    currentRun.lockedPanelId
    && currentRun.snapshot.chosenPanels.at(-1)
      !== currentRun.lockedPanelId
  ) {
    context.addIssue({
      code: 'custom',
      message: 'lockedPanelId must be the final chosen panel',
      path: ['lockedPanelId'],
    })
  }
})
const draftSnapshotSchema = z.object({
  mode: z.literal('drafting'),
  roomId: z.string().trim().min(1),
  dealSeed: z.string(),
  dealtPanels: z.array(z.string().trim().min(1)).length(12),
  slots: z.array(
    z.string().trim().min(1).nullable(),
  ).length(6),
  confirmed: z.boolean(),
  revealCount: z.number().int().min(0).max(6),
  stats: statSnapshotSchema,
  flags: z.record(z.string(), z.boolean()),
}).strict().superRefine((snapshot, context) => {
  if (new Set(snapshot.dealtPanels).size !== 12) {
    context.addIssue({
      code: 'custom',
      message: 'dealtPanels must be unique',
      path: ['dealtPanels'],
    })
  }

  const selected = snapshot.slots.filter(
    (panelId): panelId is string => panelId !== null,
  )
  if (new Set(selected).size !== selected.length) {
    context.addIssue({
      code: 'custom',
      message: 'draft slots must be unique',
      path: ['slots'],
    })
  }
  if (selected.some(
    (panelId) => !snapshot.dealtPanels.includes(panelId),
  )) {
    context.addIssue({
      code: 'custom',
      message: 'draft slots must come from dealtPanels',
      path: ['slots'],
    })
  }
  if (!snapshot.confirmed && snapshot.revealCount !== 0) {
    context.addIssue({
      code: 'custom',
      message: 'unconfirmed drafts cannot reveal cards',
      path: ['revealCount'],
    })
  }
  if (
    snapshot.confirmed
    && snapshot.slots.some((panelId) => panelId === null)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'confirmed drafts require six filled slots',
      path: ['slots'],
    })
  }
})
const draftCurrentRunSchema = z.object({
  roomId: z.string().trim().min(1),
  snapshot: draftSnapshotSchema,
}).strict().superRefine((currentRun, context) => {
  if (currentRun.snapshot.roomId !== currentRun.roomId) {
    context.addIssue({
      code: 'custom',
      message: 'snapshot roomId must match currentRun roomId',
      path: ['snapshot', 'roomId'],
    })
  }
})
const currentRunSchema = z.union([
  legacyCurrentRunSchema,
  draftCurrentRunSchema,
])
const settingsSchema = z.object({
  adultContent: z.boolean().optional(),
  exactStats: z.boolean().optional(),
  autoFastForward: z.boolean().optional(),
}).strict()
const progressV1Schema = z.object({
  version: z.literal(1),
  currentRun: z.unknown().optional(),
  completedEndings: z.record(
    z.string(),
    z.array(endingIdSchema),
  ).optional(),
  endingRecaps: z.unknown().optional(),
  clues: z.array(z.string().trim().min(1)).optional(),
  galleryUnlocks: z.array(z.string().trim().min(1)).optional(),
  crossRoomFlags: z.record(
    z.string(),
    z.boolean(),
  ).optional(),
  readHistory: z.record(
    z.string(),
    z.literal(true),
  ).optional(),
  settings: settingsSchema.optional(),
}).strict()

interface ParsedProgressValue {
  progress: ProgressData
  sanitized: boolean
}

export function createEmptyProgress(): ProgressData {
  return {
    version: 1,
    currentRun: null,
    completedEndings: {},
    endingRecaps: {},
    clues: [],
    galleryUnlocks: [],
    crossRoomFlags: {},
    readHistory: {},
    settings: {
      adultContent: true,
      exactStats: false,
      autoFastForward: true,
    },
  }
}

function parseEndingRecaps(
  value: unknown,
): { endingRecaps: EndingRecaps; sanitized: boolean } {
  if (value === undefined) {
    return { endingRecaps: {}, sanitized: false }
  }
  if (!isRecord(value)) {
    return { endingRecaps: {}, sanitized: true }
  }

  const endingRecaps: EndingRecaps = {}
  let sanitized = false
  for (const [roomId, rawRoomRecaps] of Object.entries(value)) {
    if (!roomId.trim() || !isRecord(rawRoomRecaps)) {
      sanitized = true
      continue
    }

    const roomRecaps: Partial<Record<EndingId, string[]>> = {}
    for (const [rawEndingId, rawPanelIds] of Object.entries(
      rawRoomRecaps,
    )) {
      const endingId = endingIdSchema.safeParse(rawEndingId)
      const panelIds = endingRecapSchema.safeParse(rawPanelIds)
      if (!endingId.success || !panelIds.success) {
        sanitized = true
        continue
      }
      roomRecaps[endingId.data] = [...panelIds.data]
    }

    if (Object.keys(roomRecaps).length > 0) {
      endingRecaps[roomId] = roomRecaps
    } else if (Object.keys(rawRoomRecaps).length > 0) {
      sanitized = true
    }
  }

  return { endingRecaps, sanitized }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseProgressValue(
  value: unknown,
): ParsedProgressValue | null {
  const parsed = progressV1Schema.safeParse(value)
  if (!parsed.success) return null

  const defaults = createEmptyProgress()
  const rawCurrentRun = parsed.data.currentRun
  const parsedCurrentRun = rawCurrentRun === null
    || rawCurrentRun === undefined
    ? null
    : currentRunSchema.safeParse(rawCurrentRun)
  const sanitizedCurrentRun = (
    rawCurrentRun !== null
    && rawCurrentRun !== undefined
    && parsedCurrentRun !== null
    && !parsedCurrentRun.success
  )
  const parsedEndingRecaps = parseEndingRecaps(parsed.data.endingRecaps)

  return {
    progress: {
      version: 1,
      currentRun: parsedCurrentRun?.success
        ? structuredClone(parsedCurrentRun.data)
        : null,
      completedEndings: structuredClone(
        parsed.data.completedEndings ?? defaults.completedEndings,
      ),
      endingRecaps: parsedEndingRecaps.endingRecaps,
      clues: [...(parsed.data.clues ?? defaults.clues)],
      galleryUnlocks: [
        ...(parsed.data.galleryUnlocks ?? defaults.galleryUnlocks),
      ],
      crossRoomFlags: {
        ...(parsed.data.crossRoomFlags ?? defaults.crossRoomFlags),
      },
      readHistory: {
        ...(parsed.data.readHistory ?? defaults.readHistory),
      },
      settings: {
        ...defaults.settings,
        ...parsed.data.settings,
      },
    },
    sanitized: sanitizedCurrentRun || parsedEndingRecaps.sanitized,
  }
}

function parseProgressRaw(
  raw: string,
): ParsedProgressValue | null {
  try {
    return parseProgressValue(JSON.parse(raw))
  } catch {
    return null
  }
}

function safeGet(
  storage: StorageAdapter,
  key: string,
): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(
  storage: StorageAdapter,
  key: string,
  value: string,
): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Recovery and debug retention are best effort during loading.
  }
}

export function loadProgress(
  storage: StorageAdapter = localStorage,
): ProgressData {
  const raw = safeGet(storage, PROGRESS_KEY)
  if (!raw) return createEmptyProgress()

  const primary = parseProgressRaw(raw)
  if (primary) {
    if (primary.sanitized) {
      safeSet(storage, PROGRESS_CORRUPT_KEY, raw)
      safeSet(
        storage,
        PROGRESS_KEY,
        JSON.stringify(primary.progress),
      )
    }
    return primary.progress
  }

  safeSet(storage, PROGRESS_CORRUPT_KEY, raw)
  for (const backupKey of [
    PROGRESS_BACKUP_1_KEY,
    PROGRESS_BACKUP_2_KEY,
  ]) {
    const backupRaw = safeGet(storage, backupKey)
    if (!backupRaw) continue
    const recovered = parseProgressRaw(backupRaw)
    if (!recovered) continue

    safeSet(
      storage,
      PROGRESS_KEY,
      recovered.sanitized
        ? JSON.stringify(recovered.progress)
        : backupRaw,
    )
    return recovered.progress
  }

  return createEmptyProgress()
}

function readableRaw(raw: string | null): string | null {
  return raw && parseProgressRaw(raw) ? raw : null
}

function restoreKey(
  storage: StorageAdapter,
  key: string,
  raw: string | null,
): void {
  try {
    if (raw === null) {
      storage.removeItem?.(key)
    } else {
      storage.setItem(key, raw)
    }
  } catch {
    // Preserve the original save error; rollback is best effort.
  }
}

export function saveProgress(
  storage: StorageAdapter = localStorage,
  progress: ProgressData,
): void {
  const parsed = parseProgressValue(progress)
  if (!parsed) {
    throw new Error('progress does not match version 1 schema')
  }
  const normalized = parsed.progress

  const nextRaw = JSON.stringify(normalized)
  const previous = {
    primary: storage.getItem(PROGRESS_KEY),
    backup1: storage.getItem(PROGRESS_BACKUP_1_KEY),
    backup2: storage.getItem(PROGRESS_BACKUP_2_KEY),
  }
  const priorPrimary = readableRaw(previous.primary)
  const priorBackup1 = readableRaw(previous.backup1)
  const priorBackup2 = readableRaw(previous.backup2)

  try {
    const nextBackup2 = priorBackup1 ?? priorBackup2
    if (nextBackup2) {
      storage.setItem(PROGRESS_BACKUP_2_KEY, nextBackup2)
    }
    if (priorPrimary) {
      storage.setItem(PROGRESS_BACKUP_1_KEY, priorPrimary)
    }
    storage.setItem(PROGRESS_KEY, nextRaw)
  } catch (error) {
    restoreKey(storage, PROGRESS_KEY, previous.primary)
    restoreKey(storage, PROGRESS_BACKUP_1_KEY, previous.backup1)
    restoreKey(storage, PROGRESS_BACKUP_2_KEY, previous.backup2)
    throw error
  }
}
