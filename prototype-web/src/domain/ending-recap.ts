import type { EndingId } from './types'

export interface BuildEndingSequenceInput {
  roomId: string
  endingId: EndingId
  recap?: readonly string[]
  adultEnabled: boolean
  adultReady: boolean
}

export interface EndingSequence {
  assetIds: string[]
  usedSafeFallback: boolean
}

const ROOM_PREFIX: Record<string, string> = {
  room_a_blackout: 'a',
  room_b_wall: 'b',
}

function prefixFor(roomId: string): string {
  const prefix = ROOM_PREFIX[roomId]
  if (!prefix) {
    throw new Error(`unknown room id for ending sequence: ${roomId}`)
  }
  return prefix
}

function sixFrame(prefix: string, group: 'intimacy' | 'safe'): string[] {
  return Array.from(
    { length: 6 },
    (_, index) => `${prefix}_${group}_0${index + 1}`,
  )
}

function openingFrames(prefix: string): string[] {
  return ['01', '02', '03'].map((index) => `${prefix}_open_${index}`)
}

function posterFor(prefix: string, endingId: EndingId): string {
  return `${prefix}_ending_${endingId}`
}

// Deterministic 12-second cinematic recap frame list. Never mixes rooms and is
// never empty; intimacy falls back to the safe sequence unless adult content is
// both enabled and loaded.
export function buildEndingSequence(
  input: BuildEndingSequenceInput,
): EndingSequence {
  const prefix = prefixFor(input.roomId)
  const poster = posterFor(prefix, input.endingId)

  if (input.endingId === 'intimacy') {
    const useAdult = input.adultEnabled && input.adultReady
    const frames = useAdult
      ? sixFrame(prefix, 'intimacy')
      : sixFrame(prefix, 'safe')
    return {
      assetIds: [...frames, poster],
      usedSafeFallback: !useAdult,
    }
  }

  const recapFrames = input.recap && input.recap.length > 0
    ? [...input.recap]
    : openingFrames(prefix)

  return {
    assetIds: [...recapFrames, poster],
    usedSafeFallback: false,
  }
}
