import { z } from 'zod'
import {
  createEmptySlots,
  type BuilderSlots,
} from './builder-state'

export const COMIC_SAVE_KEY = 'office-comic-builder:v1'

const slotSchema = z.string().trim().min(1).nullable()
const comicSaveSchema = z.object({
  schemaVersion: z.literal(1),
  ageConfirmed: z.boolean(),
  slots: z.tuple([
    slotSchema,
    slotSchema,
    slotSchema,
    slotSchema,
    slotSchema,
    slotSchema,
    slotSchema,
    slotSchema,
  ]),
  unlockedRouteIds: z.array(z.string().trim().min(1)),
}).strict()

export interface ComicSave {
  schemaVersion: 1
  ageConfirmed: boolean
  slots: BuilderSlots
  unlockedRouteIds: string[]
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createDefaultSave(): ComicSave {
  return {
    schemaVersion: 1,
    ageConfirmed: false,
    slots: createEmptySlots(),
    unlockedRouteIds: [],
  }
}

export function loadComicSave(
  storage: StorageAdapter = localStorage,
): ComicSave {
  try {
    const saved = storage.getItem(COMIC_SAVE_KEY)
    if (!saved) return createDefaultSave()
    return comicSaveSchema.parse(JSON.parse(saved)) as ComicSave
  } catch {
    return createDefaultSave()
  }
}

export function saveComicState(
  save: ComicSave,
  storage: StorageAdapter = localStorage,
): boolean {
  try {
    const validated = comicSaveSchema.parse(save)
    storage.setItem(COMIC_SAVE_KEY, JSON.stringify(validated))
    return true
  } catch {
    return false
  }
}
