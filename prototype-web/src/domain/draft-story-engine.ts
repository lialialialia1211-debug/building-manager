import type {
  PanelDefinition,
  RoomDefinition,
  StatName,
} from './types'

export interface DraftStorySnapshot {
  mode: 'drafting'
  roomId: string
  dealSeed: string
  dealtPanels: string[]
  slots: Array<string | null>
  confirmed: boolean
  revealCount: number
  stats: Record<StatName, number>
  flags: Record<string, boolean>
}

export interface DraftCandidate extends PanelDefinition {
  id: string
}

export class DraftStoryEngine {
  readonly room: RoomDefinition
  readonly restoredFromSavedSnapshot: boolean
  snapshot: DraftStorySnapshot

  constructor(
    room: RoomDefinition,
    inheritedFlags: Record<string, boolean> = {},
    savedSnapshot?: unknown,
    dealSeed = room.id,
  ) {
    if (!room.drafting) {
      throw new Error(`room ${room.id} does not define drafting`)
    }

    this.room = room
    this.snapshot = createInitialSnapshot(
      room,
      inheritedFlags,
      dealSeed,
    )

    if (isDraftStorySnapshot(savedSnapshot, room, inheritedFlags)) {
      this.restoredFromSavedSnapshot = true
      this.snapshot = structuredClone(savedSnapshot)
    } else {
      this.restoredFromSavedSnapshot = false
    }
  }

  getCandidates(): DraftCandidate[] {
    return this.snapshot.dealtPanels.map((panelId) => {
      const panel = this.room.panels[panelId]
      if (!panel) throw new Error(`missing story panel ${panelId}`)
      return { id: panelId, ...panel }
    })
  }

  place(panelId: string, slotIndex?: number): void {
    this.assertEditable()
    if (!this.snapshot.dealtPanels.includes(panelId)) {
      throw new Error(`${panelId} is not in the current deal`)
    }

    const target = slotIndex ?? this.snapshot.slots.indexOf(null)
    this.assertSlotIndex(target)

    const current = this.snapshot.slots.indexOf(panelId)
    if (current === target) return

    if (current >= 0) {
      const displaced = this.snapshot.slots[target] ?? null
      this.snapshot.slots[target] = panelId
      this.snapshot.slots[current] = displaced
      return
    }

    this.snapshot.slots[target] = panelId
  }

  move(fromIndex: number, toIndex: number): void {
    this.assertEditable()
    this.assertSlotIndex(fromIndex)
    this.assertSlotIndex(toIndex)
    if (fromIndex === toIndex) return

    const from = this.snapshot.slots[fromIndex]
    this.snapshot.slots[fromIndex] = this.snapshot.slots[toIndex] ?? null
    this.snapshot.slots[toIndex] = from ?? null
  }

  remove(slotIndex: number): string | null {
    this.assertEditable()
    this.assertSlotIndex(slotIndex)
    const removed = this.snapshot.slots[slotIndex]
    this.snapshot.slots[slotIndex] = null
    return removed ?? null
  }

  confirm(): void {
    this.assertEditable()
    if (
      this.snapshot.slots.length !== this.room.drafting!.selectionSize
      || this.snapshot.slots.some((panelId) => panelId === null)
    ) {
      throw new Error('confirmation requires six filled slots')
    }

    this.snapshot.confirmed = true
  }

  currentReveal(): DraftCandidate | null {
    if (!this.snapshot.confirmed || this.isComplete()) return null
    const panelId = this.snapshot.slots[this.snapshot.revealCount]
    if (!panelId) {
      throw new Error('confirmed arrangement contains an empty slot')
    }
    const panel = this.room.panels[panelId]
    if (!panel) throw new Error(`missing story panel ${panelId}`)
    return { id: panelId, ...panel }
  }

  finishCurrentReveal(): DraftCandidate {
    const panel = this.currentReveal()
    if (!panel) throw new Error('there is no card waiting to reveal')

    applyPanel(this.snapshot, panel)
    this.snapshot.revealCount += 1
    return panel
  }

  isComplete(): boolean {
    return (
      this.snapshot.confirmed
      && this.snapshot.revealCount
        === this.room.drafting!.selectionSize
    )
  }

  private assertEditable(): void {
    if (this.snapshot.confirmed) {
      throw new Error('the arrangement is already confirmed')
    }
  }

  private assertSlotIndex(slotIndex: number): void {
    if (
      !Number.isInteger(slotIndex)
      || slotIndex < 0
      || slotIndex >= this.room.drafting!.selectionSize
    ) {
      throw new Error(`invalid draft slot ${slotIndex}`)
    }
  }
}

function createInitialSnapshot(
  room: RoomDefinition,
  inheritedFlags: Record<string, boolean>,
  dealSeed: string,
): DraftStorySnapshot {
  const drafting = room.drafting
  if (!drafting) {
    throw new Error(`room ${room.id} does not define drafting`)
  }

  return {
    mode: 'drafting',
    roomId: room.id,
    dealSeed,
    dealtPanels: dealPanels(room, dealSeed),
    slots: Array<string | null>(drafting.selectionSize).fill(null),
    confirmed: false,
    revealCount: 0,
    stats: { affection: 0, trust: 0, intimacy: 0 },
    flags: { ...inheritedFlags },
  }
}

export function dealPanels(
  room: RoomDefinition,
  dealSeed: string,
): string[] {
  const drafting = room.drafting
  if (!drafting) {
    throw new Error(`room ${room.id} does not define drafting`)
  }

  const allPanelIds = Object.keys(room.panels)
  if (allPanelIds.length < drafting.dealSize) {
    throw new Error(
      `room ${room.id} has fewer panels than its deal size`,
    )
  }

  const required = [
    ...new Set(drafting.requiredDealPanels ?? []),
  ]
  for (const panelId of required) {
    if (!room.panels[panelId]) {
      throw new Error(`required deal panel ${panelId} is missing`)
    }
  }
  if (required.length > drafting.dealSize) {
    throw new Error('required deal panels exceed deal size')
  }

  const random = seededRandom(`${room.id}::${dealSeed}`)
  const remaining = shuffle(
    allPanelIds.filter((panelId) => !required.includes(panelId)),
    random,
  )
  const selected = [
    ...required,
    ...remaining.slice(0, drafting.dealSize - required.length),
  ]

  return shuffle(selected, random)
}

function applyPanel(
  snapshot: DraftStorySnapshot,
  panel: PanelDefinition,
): void {
  for (const [name, delta] of Object.entries(panel.effects ?? {})) {
    snapshot.stats[name as StatName] += delta
  }
  for (const flag of panel.setFlags ?? []) {
    snapshot.flags[flag] = true
  }
}

function isDraftStorySnapshot(
  value: unknown,
  room: RoomDefinition,
  inheritedFlags: Record<string, boolean>,
): value is DraftStorySnapshot {
  if (!hasDraftSnapshotShape(value, room)) return false

  let replay: DraftStoryEngine
  try {
    replay = new DraftStoryEngine(
      room,
      inheritedFlags,
      undefined,
      value.dealSeed,
    )
    if (!arraysEqual(replay.snapshot.dealtPanels, value.dealtPanels)) {
      return false
    }

    for (const [index, panelId] of value.slots.entries()) {
      if (panelId) replay.place(panelId, index)
    }
    if (value.confirmed) replay.confirm()
    for (let index = 0; index < value.revealCount; index += 1) {
      replay.finishCurrentReveal()
    }
  } catch {
    return false
  }

  return snapshotsEqual(replay.snapshot, value)
}

function hasDraftSnapshotShape(
  value: unknown,
  room: RoomDefinition,
): value is DraftStorySnapshot {
  const drafting = room.drafting
  if (!drafting || !isRecord(value)) return false

  const dealtPanels = value.dealtPanels
  const slots = value.slots
  const stats = value.stats
  const flags = value.flags
  const confirmed = value.confirmed
  const revealCount = value.revealCount
  if (
    value.mode !== 'drafting'
    || value.roomId !== room.id
    || typeof value.dealSeed !== 'string'
    || !Array.isArray(dealtPanels)
    || dealtPanels.length !== drafting.dealSize
    || !dealtPanels.every((panelId) => typeof panelId === 'string')
    || new Set(dealtPanels).size !== dealtPanels.length
    || !Array.isArray(slots)
    || slots.length !== drafting.selectionSize
    || !slots.every(
      (panelId) => panelId === null || typeof panelId === 'string',
    )
    || new Set(slots.filter(Boolean)).size !== slots.filter(Boolean).length
    || !slots.every(
      (panelId) => panelId === null || dealtPanels.includes(panelId),
    )
    || typeof confirmed !== 'boolean'
    || !Number.isInteger(revealCount)
    || typeof revealCount !== 'number'
    || revealCount < 0
    || revealCount > drafting.selectionSize
    || !isRecord(stats)
    || !Number.isFinite(stats.affection)
    || !Number.isFinite(stats.trust)
    || !Number.isFinite(stats.intimacy)
    || !isRecord(flags)
    || !Object.values(flags).every(
      (flagValue) => typeof flagValue === 'boolean',
    )
  ) {
    return false
  }

  if (!confirmed) {
    return revealCount === 0
  }
  return slots.every((panelId) => panelId !== null)
}

function snapshotsEqual(
  left: DraftStorySnapshot,
  right: DraftStorySnapshot,
): boolean {
  return (
    left.mode === right.mode
    && left.roomId === right.roomId
    && left.dealSeed === right.dealSeed
    && arraysEqual(left.dealtPanels, right.dealtPanels)
    && arraysEqual(left.slots, right.slots)
    && left.confirmed === right.confirmed
    && left.revealCount === right.revealCount
    && recordsEqual(left.stats, right.stats)
    && recordsEqual(left.flags, right.flags)
  )
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target]!, copy[index]!]
  }
  return copy
}

function seededRandom(seed: string): () => number {
  let state = hashString(seed)
  return () => {
    state += 0x6D2B79F5
    let result = state
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function arraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
): boolean {
  return (
    left.length === right.length
    && left.every((value, index) => value === right[index])
  )
}

function recordsEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean {
  const leftEntries = Object.entries(left)
  return (
    leftEntries.length === Object.keys(right).length
    && leftEntries.every(([key, value]) => right[key] === value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    !!value
    && typeof value === 'object'
    && !Array.isArray(value)
  )
}
