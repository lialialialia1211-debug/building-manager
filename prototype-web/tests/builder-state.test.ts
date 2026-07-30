import {
  createEmptySlots,
  firstOpenSlot,
  moveCard,
  placeCard,
  removeCard,
} from '@/domain/builder-state'

const knownCards = new Set([
  'card-a',
  'card-b',
  'card-c',
  'card-d',
  'card-e',
  'card-f',
  'card-g',
  'card-h',
])

describe('builder state', () => {
  it('creates exactly four empty slots', () => {
    expect(createEmptySlots()).toEqual([
      null, null, null, null,
    ])
  })

  it('places into an explicit slot without mutating the source', () => {
    const original = createEmptySlots()
    const next = placeCard(original, 'card-a', knownCards, 3)

    expect(next[3]).toBe('card-a')
    expect(original[3]).toBeNull()
  })

  it('places into the first empty slot when no destination is supplied', () => {
    const slots = placeCard(createEmptySlots(), 'card-a', knownCards, 0)

    expect(firstOpenSlot(slots)).toBe(1)
    expect(placeCard(slots, 'card-b', knownCards)).toEqual([
      'card-a', 'card-b', null, null,
    ])
  })

  it('moves a placed card and swaps occupied destinations', () => {
    const initial = [
      'card-a', 'card-b', null, null,
    ] as const

    expect(moveCard(initial, 0, 3)).toEqual([
      null, 'card-b', null, 'card-a',
    ])
    expect(moveCard(initial, 0, 1)).toEqual([
      'card-b', 'card-a', null, null,
    ])
  })

  it('returns a slotted card to the tray', () => {
    const initial = [
      'card-a', null, null, null,
    ] as const

    expect(removeCard(initial, 0)).toEqual(createEmptySlots())
  })

  it('rejects unknown and duplicate cards without changing slots', () => {
    const initial = [
      'card-a', null, null, null,
    ] as const

    expect(placeCard(initial, 'missing', knownCards, 2)).toBe(initial)
    expect(placeCard(initial, 'card-a', knownCards, 2)).toBe(initial)
  })
})
