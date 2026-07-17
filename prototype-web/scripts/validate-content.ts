import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRoom } from '../src/domain/content-schema'
import { DraftStoryEngine } from '../src/domain/draft-story-engine'
import { resolveEnding } from '../src/domain/ending-resolver'
import { StoryEngine } from '../src/domain/story-engine'

const here = fileURLToPath(new URL('.', import.meta.url))
const contentRoot = resolve(here, '../../content')
const requiredEndings = ['main', 'normal', 'intimacy'] as const

interface ValidationResult {
  routeIds: string[]
}

function loadRoom(roomId: string) {
  return parseRoom(
    JSON.parse(
      readFileSync(
        resolve(contentRoot, `rooms/${roomId}.json`),
        'utf8',
      ),
    ),
  )
}

function validate(
  roomId: string,
  inheritedFlags: Record<string, boolean> = {},
): ValidationResult {
  const room = loadRoom(roomId)
  for (const [panelId, panel] of Object.entries(room.panels)) {
    if (panel.actionLabel.includes(panelId)) {
      throw new Error(
        `${roomId}: panel ${panelId} exposes its id in actionLabel`,
      )
    }
  }
  const candidateIds = new Set(
    Object.values(room.nodes).flatMap((node) => node.candidates),
  )
  if (candidateIds.size !== 24) {
    throw new Error(
      `${roomId}: expected 24 candidate panels, got ${candidateIds.size}`,
    )
  }

  const reached = new Set<string>()
  const routeIds: string[] = []
  const walk = (path: string[]) => {
    const engine = new StoryEngine(room, inheritedFlags)
    for (const panelId of path) engine.choose(panelId)

    if (engine.atEndingAnchor()) {
      if (engine.snapshot.choiceCount !== 6) {
        throw new Error(
          `${roomId}: route ${path.join(' > ')} has ` +
            `${engine.snapshot.choiceCount} choices`,
        )
      }
      reached.add(
        resolveEnding(
          room.endingRules,
          engine.snapshot.stats,
          engine.snapshot.flags,
        ),
      )
      routeIds.push(path.join(' > '))
      return
    }

    if (engine.snapshot.choiceCount >= 6) {
      throw new Error(
        `${roomId}: route ${path.join(' > ')} does not end after six choices`,
      )
    }

    const candidates = engine.getCandidates()
    if (candidates.length !== 3) {
      throw new Error(
        `${roomId}: route ${path.join(' > ') || '(start)'} exposes ` +
          `${candidates.length} candidates`,
      )
    }
    for (const candidate of candidates) {
      walk([...path, candidate.id])
    }
  }

  walk([])
  for (const endingId of requiredEndings) {
    if (!reached.has(endingId)) {
      throw new Error(`${roomId}: ending ${endingId} is unreachable`)
    }
  }

  return { routeIds }
}

function combinations<T>(
  values: readonly T[],
  size: number,
  start = 0,
  prefix: T[] = [],
): T[][] {
  if (prefix.length === size) return [prefix]
  const results: T[][] = []
  for (
    let index = start;
    index <= values.length - (size - prefix.length);
    index += 1
  ) {
    results.push(...combinations(
      values,
      size,
      index + 1,
      [...prefix, values[index]!],
    ))
  }
  return results
}

function validateDrafting(
  roomId: string,
  inheritedFlags: Record<string, boolean> = {},
): void {
  const room = loadRoom(roomId)
  if (!room.drafting) {
    throw new Error(`${roomId}: missing formal drafting contract`)
  }

  for (let seedIndex = 0; seedIndex < 32; seedIndex += 1) {
    const seed = `validation-${seedIndex}`
    const deal = new DraftStoryEngine(
      room,
      inheritedFlags,
      undefined,
      seed,
    ).snapshot.dealtPanels
    const reached = new Set<string>()

    for (const selected of combinations(
      deal,
      room.drafting.selectionSize,
    )) {
      const engine = new DraftStoryEngine(
        room,
        inheritedFlags,
        undefined,
        seed,
      )
      selected.forEach((panelId, index) => {
        engine.place(panelId, index)
      })
      engine.confirm()
      while (!engine.isComplete()) {
        engine.finishCurrentReveal()
      }
      reached.add(resolveEnding(
        room.endingRules,
        engine.snapshot.stats,
        engine.snapshot.flags,
      ))
    }

    for (const endingId of requiredEndings) {
      if (!reached.has(endingId)) {
        throw new Error(
          `${roomId}: seed ${seed} cannot reach ${endingId}`,
        )
      }
    }
  }
}

validate('room_a_blackout')
const roomBDefault = validate('room_b_wall')
const roomBInherited = validate('room_b_wall', {
  a_hidden_circuit: true,
})
validateDrafting('room_a_blackout')
validateDrafting('room_b_wall')
validateDrafting('room_b_wall', {
  a_hidden_circuit: true,
})

if (
  roomBDefault.routeIds.length !== roomBInherited.routeIds.length ||
  roomBDefault.routeIds.some(
    (routeId, index) => routeId !== roomBInherited.routeIds[index],
  )
) {
  throw new Error(
    'room_b_wall: inherited a_hidden_circuit changed reachable candidates',
  )
}

console.log(
  `room_a_blackout: valid, 24 authored cards, 12-card deals, 3 endings`,
)
console.log(
  `room_b_wall: valid, 24 authored cards, 12-card deals, 3 endings`,
)
