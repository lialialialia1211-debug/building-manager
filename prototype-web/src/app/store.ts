import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  createEmptySlots,
  moveCard as moveBuilderCard,
  placeCard as placeBuilderCard,
  removeCard as removeBuilderCard,
  type BuilderSlots,
} from '@/domain/builder-state'
import type { OfficeEpisode } from '@/domain/episode-schema'
import { fetchOfficeEpisode } from '@/domain/load-episode'
import {
  loadComicSave,
  saveComicState,
  type StorageAdapter,
} from '@/domain/persistence'
import {
  resolveRoute,
  type RouteResolution,
} from '@/domain/route-resolver'

export type AppScreen =
  | 'loading'
  | 'age-gate'
  | 'builder'
  | 'reveal'
  | 'ending'
  | 'error'

export interface ComicStoreDependencies {
  storage: StorageAdapter
  loadEpisode: () => Promise<OfficeEpisode>
}

export interface ComicAppState {
  screen: AppScreen
  episode: OfficeEpisode | null
  slots: BuilderSlots
  resolution: RouteResolution | null
  revealStep: 0 | 1 | 2 | 3 | 4
  unlockedRouteIds: string[]
  ageConfirmed: boolean
  errorMessage: string | null
  initialize(): Promise<void>
  confirmAge(): void
  placeCard(cardId: string, slotIndex?: number): void
  moveCard(fromIndex: number, toIndex: number): void
  removeCard(slotIndex: number): void
  submit(): void
  advanceReveal(): void
  revealAll(): void
  returnToBuilder(): void
}

export type ComicStore = StoreApi<ComicAppState>

const browserStorage: StorageAdapter = {
  getItem(key) {
    return globalThis.localStorage?.getItem(key) ?? null
  },
  setItem(key, value) {
    globalThis.localStorage?.setItem(key, value)
  },
}

const defaultDependencies: ComicStoreDependencies = {
  storage: browserStorage,
  loadEpisode: () => fetchOfficeEpisode(),
}

export function createComicStore(
  dependencies: ComicStoreDependencies = defaultDependencies,
): ComicStore {
  const save = loadComicSave(dependencies.storage)

  return createStore<ComicAppState>((set, get) => {
    const persist = (
      state: Pick<
        ComicAppState,
        'ageConfirmed' | 'slots' | 'unlockedRouteIds'
      >,
    ) => {
      saveComicState({
        schemaVersion: 2,
        ageConfirmed: state.ageConfirmed,
        slots: state.slots,
        unlockedRouteIds: state.unlockedRouteIds,
      }, dependencies.storage)
    }

    return {
      screen: 'loading',
      episode: null,
      slots: save.slots,
      resolution: null,
      revealStep: 0,
      unlockedRouteIds: save.unlockedRouteIds,
      ageConfirmed: save.ageConfirmed,
      errorMessage: null,

      async initialize() {
        set({
          screen: 'loading',
          errorMessage: null,
        })
        try {
          const episode = await dependencies.loadEpisode()
          set((state) => {
            const savedCardIds = state.slots.filter(
              (cardId): cardId is string => cardId !== null,
            )
            const knownCardIds = new Set(
              episode.cards.map((card) => card.id),
            )
            const slotsAreValid = savedCardIds.every(
              (cardId) => knownCardIds.has(cardId),
            ) && new Set(savedCardIds).size === savedCardIds.length
            const next = {
              ...state,
              episode,
              slots: slotsAreValid ? state.slots : createEmptySlots(),
              screen: state.ageConfirmed ? 'builder' as const : 'age-gate' as const,
              errorMessage: null,
            }
            if (!slotsAreValid) persist(next)
            return next
          })
        } catch (error) {
          set({
            screen: 'error',
            errorMessage: error instanceof Error
              ? error.message
              : '無法載入劇本。',
          })
        }
      },

      confirmAge() {
        set((state) => {
          const next = {
            ...state,
            ageConfirmed: true,
            screen: 'builder' as const,
          }
          persist(next)
          return next
        })
      },

      placeCard(cardId, slotIndex) {
        set((state) => {
          if (!state.episode) return state
          const knownCardIds = new Set(
            state.episode.cards.map((card) => card.id),
          )
          const slots = placeBuilderCard(
            state.slots,
            cardId,
            knownCardIds,
            slotIndex,
          )
          if (slots === state.slots) return state
          const next = { ...state, slots, resolution: null }
          persist(next)
          return next
        })
      },

      moveCard(fromIndex, toIndex) {
        set((state) => {
          const slots = moveBuilderCard(
            state.slots,
            fromIndex,
            toIndex,
          )
          if (slots === state.slots) return state
          const next = { ...state, slots, resolution: null }
          persist(next)
          return next
        })
      },

      removeCard(slotIndex) {
        set((state) => {
          const slots = removeBuilderCard(state.slots, slotIndex)
          if (slots === state.slots) return state
          const next = { ...state, slots, resolution: null }
          persist(next)
          return next
        })
      },

      submit() {
        const state = get()
        if (!state.episode) return
        const resolution = resolveRoute(state.slots, state.episode)
        if (resolution.kind === 'invalid') {
          set({ resolution, screen: 'builder' })
          return
        }
        set({
          resolution,
          revealStep: 0,
          screen: 'reveal',
        })
      },

      advanceReveal() {
        set((state) => {
          if (
            state.screen !== 'reveal'
            || !state.resolution
            || state.resolution.kind === 'invalid'
          ) {
            return state
          }
          if (state.revealStep < 4) {
            return {
              ...state,
              revealStep: (state.revealStep + 1) as 1 | 2 | 3 | 4,
            }
          }

          const routeId = state.resolution.routeId
          const unlockedRouteIds = state.unlockedRouteIds.includes(routeId)
            ? state.unlockedRouteIds
            : [...state.unlockedRouteIds, routeId]
          const next = {
            ...state,
            screen: 'ending' as const,
            unlockedRouteIds,
          }
          persist(next)
          return next
        })
      },

      revealAll() {
        set((state) => {
          if (
            state.screen !== 'reveal'
            || !state.resolution
            || state.resolution.kind === 'invalid'
          ) {
            return state
          }
          return {
            ...state,
            revealStep: 4,
          }
        })
      },

      returnToBuilder() {
        set({
          screen: 'builder',
          revealStep: 0,
        })
      },
    }
  })
}

export const comicStore = createComicStore()
