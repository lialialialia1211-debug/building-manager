import { create } from 'zustand'
import {
  createStore,
  type StateCreator,
  type StoreApi,
} from 'zustand/vanilla'
import {
  defaultPlaytestRecorder,
  type PlaytestRecorder,
} from '@/analytics/playtest-log'
import {
  loadProgress,
  saveProgress,
  type ProgressData,
  type ProgressSettings,
  type StorageAdapter,
} from '@/domain/progress'
import { resolveEnding } from '@/domain/ending-resolver'
import { DraftStoryEngine } from '@/domain/draft-story-engine'
import { markRead } from '@/domain/read-history'
import { loadRoom as loadRoomFromRepository } from '@/domain/repository'
import { StoryEngine } from '@/domain/story-engine'
import type {
  EndingId,
  RoomDefinition,
} from '@/domain/types'

export type ScreenId =
  | 'building'
  | 'roomBrief'
  | 'comic'
  | 'result'
  | 'gallery'
  | 'settings'

export interface SettledResult {
  roomId: string
  endingId: EndingId
  newClues: string[]
  newGalleryUnlocks: string[]
}

export interface AppError {
  message: string
  actionLabel: string
}

export interface AppStore {
  screen: ScreenId
  selectedRoomId: string | null
  progress: ProgressData
  engine: StoryEngine | DraftStoryEngine | null
  settledResult: SettledResult | null
  choiceLocked: boolean
  openingPending: boolean
  revealedPanelId: string | null
  error: AppError | null
  goTo(screen: ScreenId): void
  finishOpening(): void
  selectRoom(roomId: string): void
  startRoom(roomId: string): Promise<void>
  resumeCurrentRun(): Promise<void>
  choosePanel(panelId: string): void
  placePanel(panelId: string, slotIndex?: number): void
  movePanel(fromIndex: number, toIndex: number): void
  removePanel(slotIndex: number): void
  confirmArrangement(): void
  finishReveal(dialogueVariant?: string): void
  updateSetting<K extends keyof ProgressSettings>(
    setting: K,
    value: ProgressSettings[K],
  ): void
  retryError(): void
}

export type RoomLoader = (roomId: string) => Promise<RoomDefinition>

export interface AppStoreDependencies {
  storage?: StorageAdapter
  loadRoom?: RoomLoader
  recorder?: PlaytestRecorder
  createRunSeed?: () => string
}

export type AppStoreApi = StoreApi<AppStore>

interface ResolvedDependencies {
  storage: StorageAdapter
  loadRoom: RoomLoader
  recorder: PlaytestRecorder
  createRunSeed: () => string
}

function resolveDependencies(
  dependencies: AppStoreDependencies = {},
): ResolvedDependencies {
  return {
    storage: dependencies.storage ?? localStorage,
    loadRoom: dependencies.loadRoom ?? loadRoomFromRepository,
    recorder: dependencies.recorder ?? defaultPlaytestRecorder,
    createRunSeed: dependencies.createRunSeed ?? defaultRunSeed,
  }
}

function recapPanelIds(panelIds: readonly (string | null)[]): string[] {
  return [...new Set(
    panelIds.filter(
      (panelId): panelId is string =>
        typeof panelId === 'string' && panelId.length > 0,
    ),
  )].slice(0, 6)
}

function writeEndingRecap(
  progress: ProgressData,
  roomId: string,
  endingId: EndingId,
  panelIds: readonly (string | null)[],
): void {
  const recap = recapPanelIds(panelIds)
  if (recap.length === 0) return
  if (!progress.endingRecaps) progress.endingRecaps = {}
  progress.endingRecaps[roomId] = {
    ...progress.endingRecaps[roomId],
    [endingId]: recap,
  }
}

function defaultRunSeed(): string {
  if (
    typeof crypto !== 'undefined'
    && typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random()}`
}

function createState(
  dependencies: ResolvedDependencies,
): StateCreator<AppStore> {
  let roomLoadGeneration = 0
  let retryOperation: (() => void) | null = null

  dependencies.recorder.record('session_started', {})
  dependencies.recorder.record('screen_viewed', {
    screen: 'building',
  })

  function beginRoomLoad(): number {
    roomLoadGeneration += 1
    return roomLoadGeneration
  }

  function invalidateRoomLoads(): void {
    roomLoadGeneration += 1
  }

  function recordScreen(
    screen: ScreenId,
    roomId?: string,
  ): void {
    dependencies.recorder.record(
      'screen_viewed',
      roomId ? { screen, roomId } : { screen },
    )
    if (screen === 'gallery') {
      dependencies.recorder.record('gallery_opened', {})
    }
  }

  function recordCandidates(
    engine: StoryEngine | DraftStoryEngine,
    revealedPanelId?: string,
  ): void {
    if (engine instanceof DraftStoryEngine) {
      if (engine.snapshot.confirmed) return
      for (const panelId of engine.snapshot.dealtPanels) {
        dependencies.recorder.record('candidate_shown', {
          roomId: engine.room.id,
          panelId,
          step: 1,
        })
      }
      return
    }

    const candidateIds = revealedPanelId
      ? Object.values(engine.room.nodes).find(
          ({ candidates }) =>
            candidates.includes(revealedPanelId),
        )?.candidates ?? []
      : engine.atEndingAnchor()
        ? []
        : engine.getCandidates().map(({ id }) => id)
    const step = revealedPanelId
      ? engine.snapshot.choiceCount
      : engine.snapshot.choiceCount + 1

    for (const panelId of candidateIds) {
      dependencies.recorder.record('candidate_shown', {
        roomId: engine.room.id,
        panelId,
        step,
      })
    }
  }

  return (set, get) => ({
    screen: 'building',
    selectedRoomId: null,
    progress: loadProgress(dependencies.storage),
    engine: null,
    settledResult: null,
    choiceLocked: false,
    openingPending: false,
    revealedPanelId: null,
    error: null,
    goTo(screen) {
      invalidateRoomLoads()
      const previousScreen = get().screen
      const roomId = (
        screen === 'roomBrief'
        || screen === 'comic'
        || screen === 'result'
      )
        ? get().selectedRoomId ?? undefined
        : undefined
      set({ screen })
      if (screen !== previousScreen) recordScreen(screen, roomId)
    },
    finishOpening() {
      if (!get().openingPending) return
      set({ openingPending: false })
    },
    selectRoom(roomId) {
      invalidateRoomLoads()
      set({
        selectedRoomId: roomId,
        screen: 'roomBrief',
        settledResult: null,
      })
      recordScreen('roomBrief', roomId)
    },
    async startRoom(roomId) {
      const loadGeneration = beginRoomLoad()
      let room: RoomDefinition
      try {
        room = await dependencies.loadRoom(roomId)
      } catch {
        if (loadGeneration !== roomLoadGeneration) return
        retryOperation = () => {
          void get().startRoom(roomId)
        }
        set({
          error: {
            message: '房間載入失敗，請檢查連線或內容資料後重試。',
            actionLabel: '重試載入',
          },
        })
        return
      }
      if (loadGeneration !== roomLoadGeneration) return

      const progress = get().progress
      const engine = room.drafting
        ? new DraftStoryEngine(
            room,
            progress.crossRoomFlags,
            undefined,
            dependencies.createRunSeed(),
          )
        : new StoryEngine(
            room,
            progress.crossRoomFlags,
          )
      let nextProgress = progress
      if (engine instanceof DraftStoryEngine) {
        nextProgress = structuredClone(progress)
        nextProgress.currentRun = {
          roomId: room.id,
          snapshot: structuredClone(engine.snapshot),
        }
        try {
          saveProgress(dependencies.storage, nextProgress)
        } catch {
          retryOperation = () => {
            void get().startRoom(roomId)
          }
          set({
            error: {
              message:
                '無法建立並保存這次十二張劇情卡牌局，請重試。',
              actionLabel: '重新建立牌局',
            },
          })
          return
        }
      }
      set({
        screen: 'comic',
        selectedRoomId: roomId,
        progress: nextProgress,
        engine,
        settledResult: null,
        choiceLocked: false,
        openingPending: true,
        revealedPanelId: null,
        error: null,
      })
      retryOperation = null
      if (
        (get().progress.completedEndings[roomId] ?? []).length > 0
      ) {
        dependencies.recorder.record('replay_started', { roomId })
      }
      recordScreen('comic', roomId)
      recordCandidates(engine)
    },
    async resumeCurrentRun() {
      const progress = get().progress
      const { currentRun, crossRoomFlags } = progress
      if (!currentRun) return

      const loadGeneration = beginRoomLoad()
      let room: RoomDefinition
      try {
        room = await dependencies.loadRoom(currentRun.roomId)
      } catch {
        if (
          loadGeneration !== roomLoadGeneration
          || get().progress.currentRun !== currentRun
        ) {
          return
        }
        retryOperation = () => {
          void get().resumeCurrentRun()
        }
        set({
          error: {
            message:
              '房間載入失敗；未完成的進度仍已保留，請重試。',
            actionLabel: '重試載入',
          },
        })
        return
      }
      if (
        loadGeneration !== roomLoadGeneration
        || get().progress.currentRun !== currentRun
        || get().progress.crossRoomFlags !== crossRoomFlags
      ) {
        return
      }

      const engine = room.drafting
        ? new DraftStoryEngine(
            room,
            crossRoomFlags,
            currentRun.snapshot,
          )
        : new StoryEngine(
            room,
            crossRoomFlags,
            currentRun.snapshot,
          )
      if (!engine.restoredFromSavedSnapshot) {
        const nextProgress = structuredClone(progress)
        nextProgress.currentRun = null
        try {
          saveProgress(dependencies.storage, nextProgress)
        } catch {
          retryOperation = () => {
            void get().resumeCurrentRun()
          }
          set({
            error: {
              message:
                '無法安全恢復這份進度，也無法清理失效存檔。請重試。',
              actionLabel: '重試清理存檔',
            },
          })
          return
        }

        retryOperation = null
        set({
          progress: nextProgress,
          engine: null,
          choiceLocked: false,
          revealedPanelId: null,
          error: null,
        })
        return
      }
      const lockedPanelId = engine instanceof DraftStoryEngine
        ? engine.currentReveal()?.id ?? null
        : (
            currentRun.lockedPanelId
            && engine.snapshot.chosenPanels.at(-1)
              === currentRun.lockedPanelId
          )
          ? currentRun.lockedPanelId
          : null

      set({
        screen: 'comic',
        selectedRoomId: room.id,
        engine,
        settledResult: null,
        choiceLocked: engine instanceof DraftStoryEngine
          ? engine.snapshot.confirmed
          : lockedPanelId !== null,
        openingPending: false,
        revealedPanelId: lockedPanelId,
        error: null,
      })
      retryOperation = null
      recordScreen('comic', room.id)
      recordCandidates(engine, lockedPanelId ?? undefined)
    },
    choosePanel(panelId) {
      const state = get()
      if (state.choiceLocked || !state.engine) return
      if (state.engine instanceof DraftStoryEngine) {
        get().placePanel(panelId)
        return
      }

      const nextEngine = new StoryEngine(
        state.engine.room,
        state.progress.crossRoomFlags,
      )
      for (const chosenPanelId of state.engine.snapshot.chosenPanels) {
        nextEngine.choose(chosenPanelId)
      }
      const panel = nextEngine.choose(panelId)
      const nextProgress = structuredClone(state.progress)
      nextProgress.currentRun = {
        roomId: nextEngine.room.id,
        lockedPanelId: panel.id,
        snapshot: structuredClone(nextEngine.snapshot),
      }
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().choosePanel(panelId)
        set({
          error: {
            message:
              '無法保存這次選擇。請確認瀏覽器儲存空間後重試。',
            actionLabel: '重新保存選擇',
          },
        })
        return
      }

      retryOperation = null
      dependencies.recorder.record('choice_made', {
        roomId: nextEngine.room.id,
        panelId: panel.id,
        step: nextEngine.snapshot.choiceCount,
      })
      set({
        engine: nextEngine,
        progress: nextProgress,
        choiceLocked: true,
        revealedPanelId: panel.id,
        error: null,
      })
    },
    placePanel(panelId, slotIndex) {
      const state = get()
      if (
        state.choiceLocked
        || !(state.engine instanceof DraftStoryEngine)
      ) {
        return
      }

      const nextEngine = new DraftStoryEngine(
        state.engine.room,
        state.progress.crossRoomFlags,
        state.engine.snapshot,
      )
      try {
        nextEngine.place(panelId, slotIndex)
      } catch {
        return
      }

      const nextProgress = structuredClone(state.progress)
      nextProgress.currentRun = {
        roomId: nextEngine.room.id,
        snapshot: structuredClone(nextEngine.snapshot),
      }
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().placePanel(panelId, slotIndex)
        set({
          error: {
            message:
              '無法保存目前的漫畫編排，請確認儲存空間後重試。',
            actionLabel: '重新保存編排',
          },
        })
        return
      }

      retryOperation = null
      set({
        engine: nextEngine,
        progress: nextProgress,
        error: null,
      })
    },
    movePanel(fromIndex, toIndex) {
      const state = get()
      if (
        state.choiceLocked
        || !(state.engine instanceof DraftStoryEngine)
      ) {
        return
      }

      const nextEngine = new DraftStoryEngine(
        state.engine.room,
        state.progress.crossRoomFlags,
        state.engine.snapshot,
      )
      try {
        nextEngine.move(fromIndex, toIndex)
      } catch {
        return
      }

      const nextProgress = structuredClone(state.progress)
      nextProgress.currentRun = {
        roomId: nextEngine.room.id,
        snapshot: structuredClone(nextEngine.snapshot),
      }
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().movePanel(fromIndex, toIndex)
        set({
          error: {
            message: '無法保存分鏡換位，請重試。',
            actionLabel: '重新保存換位',
          },
        })
        return
      }

      retryOperation = null
      set({
        engine: nextEngine,
        progress: nextProgress,
        error: null,
      })
    },
    removePanel(slotIndex) {
      const state = get()
      if (
        state.choiceLocked
        || !(state.engine instanceof DraftStoryEngine)
      ) {
        return
      }

      const nextEngine = new DraftStoryEngine(
        state.engine.room,
        state.progress.crossRoomFlags,
        state.engine.snapshot,
      )
      try {
        nextEngine.remove(slotIndex)
      } catch {
        return
      }

      const nextProgress = structuredClone(state.progress)
      nextProgress.currentRun = {
        roomId: nextEngine.room.id,
        snapshot: structuredClone(nextEngine.snapshot),
      }
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().removePanel(slotIndex)
        set({
          error: {
            message: '無法保存移除後的編排，請重試。',
            actionLabel: '重新保存移除',
          },
        })
        return
      }

      retryOperation = null
      set({
        engine: nextEngine,
        progress: nextProgress,
        error: null,
      })
    },
    confirmArrangement() {
      const state = get()
      if (
        state.choiceLocked
        || !(state.engine instanceof DraftStoryEngine)
        || state.engine.snapshot.slots.some(
          (panelId) => panelId === null,
        )
      ) {
        return
      }

      const nextEngine = new DraftStoryEngine(
        state.engine.room,
        state.progress.crossRoomFlags,
        state.engine.snapshot,
      )
      nextEngine.confirm()
      const nextProgress = structuredClone(state.progress)
      nextProgress.currentRun = {
        roomId: nextEngine.room.id,
        snapshot: structuredClone(nextEngine.snapshot),
      }
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().confirmArrangement()
        set({
          error: {
            message:
              '無法鎖定這組六格編排；目前仍可調整，請重試。',
            actionLabel: '重新確認編排',
          },
        })
        return
      }

      nextEngine.snapshot.slots.forEach((selectedPanelId, index) => {
        if (!selectedPanelId) return
        dependencies.recorder.record('choice_made', {
          roomId: nextEngine.room.id,
          panelId: selectedPanelId,
          step: index + 1,
        })
      })
      const firstReveal = nextEngine.currentReveal()
      retryOperation = null
      set({
        engine: nextEngine,
        progress: nextProgress,
        choiceLocked: true,
        revealedPanelId: firstReveal?.id ?? null,
        error: null,
      })
    },
    finishReveal(dialogueVariant) {
      const state = get()
      if (
        !state.engine
        || !state.choiceLocked
        || !state.revealedPanelId
      ) {
        return
      }

      if (state.engine instanceof DraftStoryEngine) {
        const currentPanel = state.engine.currentReveal()
        if (!currentPanel || currentPanel.id !== state.revealedPanelId) {
          return
        }

        const nextEngine = new DraftStoryEngine(
          state.engine.room,
          state.progress.crossRoomFlags,
          state.engine.snapshot,
        )
        const panel = nextEngine.finishCurrentReveal()
        const nextProgress = structuredClone(state.progress)
        nextProgress.readHistory = markRead(
          nextProgress.readHistory,
          panel.id,
          dialogueVariant ?? panel.dialogueVariant,
        )

        if (nextEngine.isComplete()) {
          const { room, snapshot } = nextEngine
          const endingId = resolveEnding(
            room.endingRules,
            snapshot.stats,
            snapshot.flags,
          )
          const endingContent = room.endingContent[endingId]
          const completedEndings = (
            nextProgress.completedEndings[room.id] ?? []
          )
          const newClues = [...new Set(endingContent.clueIds)].filter(
            (clueId) => !nextProgress.clues.includes(clueId),
          )
          const newGalleryUnlocks = [
            ...new Set(endingContent.galleryUnlocks),
          ].filter(
            (unlockId) =>
              !nextProgress.galleryUnlocks.includes(unlockId),
          )

          if (!completedEndings.includes(endingId)) {
            nextProgress.completedEndings[room.id] = [
              ...completedEndings,
              endingId,
            ]
          }
          nextProgress.clues.push(...newClues)
          nextProgress.galleryUnlocks.push(...newGalleryUnlocks)
          writeEndingRecap(
            nextProgress,
            room.id,
            endingId,
            snapshot.slots,
          )
          if (
            room.id === 'room_a_blackout'
            && endingId === 'main'
          ) {
            nextProgress.crossRoomFlags.a_hidden_circuit = true
            nextProgress.crossRoomFlags.a_symbol_traced = Boolean(
              snapshot.flags.a_symbol_traced,
            )
          }
          nextProgress.currentRun = null
          try {
            saveProgress(dependencies.storage, nextProgress)
          } catch {
            retryOperation = () => get().finishReveal(dialogueVariant)
            set({
              error: {
                message:
                  '無法保存最後一格與結局；已鎖定編排仍保留，請重試。',
                actionLabel: '重新保存結局',
              },
            })
            return
          }

          retryOperation = null
          dependencies.recorder.record('ending_reached', {
            roomId: room.id,
            endingId,
            choiceCount: snapshot.revealCount,
          })
          set({
            screen: 'result',
            progress: nextProgress,
            engine: nextEngine,
            settledResult: {
              roomId: room.id,
              endingId,
              newClues,
              newGalleryUnlocks,
            },
            choiceLocked: false,
            revealedPanelId: null,
            error: null,
          })
          recordScreen('result', room.id)
          return
        }

        nextProgress.currentRun = {
          roomId: nextEngine.room.id,
          snapshot: structuredClone(nextEngine.snapshot),
        }
        try {
          saveProgress(dependencies.storage, nextProgress)
        } catch {
          retryOperation = () => get().finishReveal(dialogueVariant)
          set({
            error: {
              message:
                '無法保存這格揭曉進度；編排仍鎖定，請重試。',
              actionLabel: '重新保存揭曉',
            },
          })
          return
        }

        retryOperation = null
        set({
          engine: nextEngine,
          progress: nextProgress,
          choiceLocked: true,
          revealedPanelId: nextEngine.currentReveal()?.id ?? null,
          error: null,
        })
        return
      }

      if (
        state.engine.atEndingAnchor()
        && state.engine.snapshot.choiceCount !== 6
      ) {
        throw new Error(
          'ending anchor reached after '
          + `${state.engine.snapshot.choiceCount} choices; expected 6`,
        )
      }

      const panel = state.engine.room.panels[state.revealedPanelId]
      const nextProgress = structuredClone(state.progress)
      nextProgress.readHistory = markRead(
        nextProgress.readHistory,
        state.revealedPanelId,
        dialogueVariant ?? panel?.dialogueVariant,
      )

      if (state.engine.atEndingAnchor()) {
        const { room, snapshot } = state.engine
        const endingId = resolveEnding(
          room.endingRules,
          snapshot.stats,
          snapshot.flags,
        )
        const endingContent = room.endingContent[endingId]
        const completedEndings = (
          nextProgress.completedEndings[room.id] ?? []
        )
        const newClues = [...new Set(endingContent.clueIds)].filter(
          (clueId) => !nextProgress.clues.includes(clueId),
        )
        const newGalleryUnlocks = [
          ...new Set(endingContent.galleryUnlocks),
        ].filter(
          (unlockId) => !nextProgress.galleryUnlocks.includes(unlockId),
        )

        if (!completedEndings.includes(endingId)) {
          nextProgress.completedEndings[room.id] = [
            ...completedEndings,
            endingId,
          ]
        }
        nextProgress.clues.push(...newClues)
        nextProgress.galleryUnlocks.push(...newGalleryUnlocks)
        writeEndingRecap(
          nextProgress,
          room.id,
          endingId,
          snapshot.chosenPanels,
        )
        if (
          room.id === 'room_a_blackout'
          && endingId === 'main'
        ) {
          nextProgress.crossRoomFlags.a_hidden_circuit = true
          nextProgress.crossRoomFlags.a_symbol_traced = Boolean(
            snapshot.flags.a_symbol_traced,
          )
        }
        nextProgress.currentRun = null
        try {
          saveProgress(dependencies.storage, nextProgress)
        } catch {
          retryOperation = () => get().finishReveal(dialogueVariant)
          set({
            error: {
              message:
                '無法保存揭曉進度。已鎖定的選擇仍保留，請重試。',
              actionLabel: '重新保存進度',
            },
          })
          return
        }

        retryOperation = null
        dependencies.recorder.record('ending_reached', {
          roomId: room.id,
          endingId,
          choiceCount: snapshot.choiceCount,
        })
        set({
          screen: 'result',
          progress: nextProgress,
          settledResult: {
            roomId: room.id,
            endingId,
            newClues,
            newGalleryUnlocks,
          },
          choiceLocked: false,
          revealedPanelId: null,
          error: null,
        })
        recordScreen('result', room.id)
        return
      }

      nextProgress.currentRun = {
        roomId: state.engine.room.id,
        snapshot: structuredClone(state.engine.snapshot),
      }
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().finishReveal(dialogueVariant)
        set({
          error: {
            message:
              '無法保存揭曉進度。已鎖定的選擇仍保留，請重試。',
            actionLabel: '重新保存進度',
          },
        })
        return
      }

      retryOperation = null
      set({
        progress: nextProgress,
        choiceLocked: false,
        revealedPanelId: null,
        error: null,
      })
      recordCandidates(state.engine)
    },
    updateSetting(setting, value) {
      const nextProgress = structuredClone(get().progress)
      nextProgress.settings[setting] = value
      try {
        saveProgress(dependencies.storage, nextProgress)
      } catch {
        retryOperation = () => get().updateSetting(setting, value)
        set({
          error: {
            message:
              '無法保存設定。請確認瀏覽器儲存空間後重試。',
            actionLabel: '重新保存設定',
          },
        })
        return
      }

      retryOperation = null
      set({ progress: nextProgress, error: null })
    },
    retryError() {
      const retry = retryOperation
      retryOperation = null
      set({ error: null })
      retry?.()
    },
  })
}

export function createAppStore(
  dependencies: AppStoreDependencies = {},
): AppStoreApi {
  return createStore<AppStore>()(
    createState(resolveDependencies(dependencies)),
  )
}

export const useAppStore = create<AppStore>()(
  createState(resolveDependencies()),
)
