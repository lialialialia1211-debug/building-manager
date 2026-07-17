import { expect, test } from 'vitest'
import { shouldShowSixthRoom } from '@/domain/unlocks'
import { createEmptyProgress } from '@/domain/progress'

test('requires both main endings', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main'],
    room_b_wall: ['main'],
  }

  expect(shouldShowSixthRoom(progress)).toBe(true)
})

test('one main ending is insufficient', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main'],
  }

  expect(shouldShowSixthRoom(progress)).toBe(false)
})

test('non-main endings do not unlock the sixth room', () => {
  const progress = createEmptyProgress()
  progress.completedEndings = {
    room_a_blackout: ['main', 'normal'],
    room_b_wall: ['normal', 'intimacy'],
  }

  expect(shouldShowSixthRoom(progress)).toBe(false)
})
