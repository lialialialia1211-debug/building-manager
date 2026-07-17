import type {
  Conditions,
  PanelDefinition,
  RoomDefinition,
  StatName,
} from './types'

export interface StorySnapshot {
  roomId: string
  currentNode: string
  choiceCount: number
  chosenPanels: string[]
  stats: Record<StatName, number>
  flags: Record<string, boolean>
}

export interface Candidate extends PanelDefinition {
  id: string
}

export type RevealedPanel = Candidate

export class StoryEngine {
  readonly room: RoomDefinition
  readonly restoredFromSavedSnapshot: boolean
  snapshot: StorySnapshot

  constructor(
    room: RoomDefinition,
    inheritedFlags: Record<string, boolean> = {},
    savedSnapshot?: unknown,
  ) {
    this.room = room
    const alternate = Object.entries(room.alternateStartNodes ?? {}).find(
      ([requiredFlag]) => inheritedFlags[requiredFlag],
    )?.[1]

    this.snapshot = {
      roomId: room.id,
      currentNode: alternate ?? room.startNode,
      choiceCount: 0,
      chosenPanels: [],
      stats: { affection: 0, trust: 0, intimacy: 0 },
      flags: { ...inheritedFlags },
    }

    if (isStorySnapshot(savedSnapshot, room, inheritedFlags)) {
      this.restoredFromSavedSnapshot = true
      this.snapshot = structuredClone(savedSnapshot)
    } else {
      this.restoredFromSavedSnapshot = false
    }
  }

  getCandidates(): Candidate[] {
    const node = this.room.nodes[this.snapshot.currentNode]
    if (!node) {
      throw new Error(`missing story node ${this.snapshot.currentNode}`)
    }

    return node.candidates
      .map((id) => {
        const panel = this.room.panels[id]
        if (!panel) throw new Error(`missing story panel ${id}`)
        return { id, ...panel }
      })
      .filter((panel) => this.conditionsMatch(panel.conditions))
  }

  choose(panelId: string): RevealedPanel {
    const panel = this.getCandidates().find(
      (candidate) => candidate.id === panelId,
    )
    if (!panel) {
      throw new Error(`${panelId} is not a current candidate`)
    }

    for (const [name, delta] of Object.entries(panel.effects ?? {})) {
      this.snapshot.stats[name as StatName] += delta
    }
    for (const flag of panel.setFlags ?? []) {
      this.snapshot.flags[flag] = true
    }

    this.snapshot.chosenPanels.push(panel.id)
    this.snapshot.choiceCount += 1
    this.snapshot.currentNode = panel.next

    return panel
  }

  atEndingAnchor(): boolean {
    return this.snapshot.currentNode === this.room.endingAnchor
  }

  private conditionsMatch(conditions: Conditions | undefined): boolean {
    if (!conditions) return true
    if (
      conditions.allFlags?.some(
        (flag) => !this.snapshot.flags[flag],
      )
    ) {
      return false
    }
    if (
      conditions.noneFlags?.some((flag) => this.snapshot.flags[flag])
    ) {
      return false
    }

    return !Object.entries(conditions.minimumStats ?? {}).some(
      ([name, minimum]) =>
        this.snapshot.stats[name as StatName] < minimum,
    )
  }
}

function isStorySnapshot(
  value: unknown,
  room: RoomDefinition,
  inheritedFlags: Record<string, boolean>,
): value is StorySnapshot {
  if (!hasSnapshotShape(value, room)) return false

  const replay = new StoryEngine(room, inheritedFlags)
  try {
    for (const panelId of value.chosenPanels) {
      if (replay.atEndingAnchor()) return false
      replay.choose(panelId)
    }
  } catch {
    return false
  }

  return snapshotsEqual(replay.snapshot, value)
}

function hasSnapshotShape(
  value: unknown,
  room: RoomDefinition,
): value is StorySnapshot {
  if (!isRecord(value)) return false

  const stats = value.stats
  const flags = value.flags
  return (
    value.roomId === room.id
    && typeof value.currentNode === 'string'
    && Number.isInteger(value.choiceCount)
    && typeof value.choiceCount === 'number'
    && value.choiceCount >= 0
    && value.choiceCount <= 6
    && Array.isArray(value.chosenPanels)
    && value.chosenPanels.length === value.choiceCount
    && value.chosenPanels.every(
      (panelId) => typeof panelId === 'string',
    )
    && isRecord(stats)
    && Number.isFinite(stats.affection)
    && Number.isFinite(stats.trust)
    && Number.isFinite(stats.intimacy)
    && isRecord(flags)
    && Object.values(flags).every(
      (flagValue) => typeof flagValue === 'boolean',
    )
  )
}

function snapshotsEqual(
  left: StorySnapshot,
  right: StorySnapshot,
): boolean {
  return (
    left.roomId === right.roomId
    && left.currentNode === right.currentNode
    && left.choiceCount === right.choiceCount
    && arraysEqual(left.chosenPanels, right.chosenPanels)
    && recordsEqual(left.stats, right.stats)
    && recordsEqual(left.flags, right.flags)
  )
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
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
