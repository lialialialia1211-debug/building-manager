export type BuilderSlots = readonly [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
]

export function createEmptySlots(): BuilderSlots {
  return [null, null, null, null, null, null, null, null]
}

export function firstOpenSlot(slots: BuilderSlots): number | null {
  const index = slots.findIndex((cardId) => cardId === null)
  return index === -1 ? null : index
}

export function placeCard(
  slots: BuilderSlots,
  cardId: string,
  knownCardIds: ReadonlySet<string>,
  requestedIndex?: number,
): BuilderSlots {
  if (!knownCardIds.has(cardId) || slots.includes(cardId)) return slots

  const targetIndex = requestedIndex ?? firstOpenSlot(slots)
  if (
    targetIndex === null
    || !Number.isInteger(targetIndex)
    || targetIndex < 0
    || targetIndex >= slots.length
    || slots[targetIndex] !== null
  ) {
    return slots
  }

  const next = [...slots]
  next[targetIndex] = cardId
  return asBuilderSlots(next)
}

export function moveCard(
  slots: BuilderSlots,
  fromIndex: number,
  toIndex: number,
): BuilderSlots {
  if (
    fromIndex === toIndex
    || !isSlotIndex(fromIndex)
    || !isSlotIndex(toIndex)
    || slots[fromIndex] === null
  ) {
    return slots
  }

  const next = [...slots]
  ;[next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]
  return asBuilderSlots(next)
}

export function removeCard(
  slots: BuilderSlots,
  index: number,
): BuilderSlots {
  if (!isSlotIndex(index) || slots[index] === null) return slots

  const next = [...slots]
  next[index] = null
  return asBuilderSlots(next)
}

function isSlotIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < 8
}

function asBuilderSlots(values: Array<string | null>): BuilderSlots {
  if (values.length !== 8) {
    throw new Error('Builder slots must contain exactly eight positions')
  }
  return values as unknown as BuilderSlots
}
