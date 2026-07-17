import { expect, test } from 'vitest'
import { markRead, wasRead } from '@/domain/read-history'
import { revealDuration } from '@/domain/read-speed'

test('unread standard panel is 2200ms', () => {
  expect(revealDuration({
    wasRead: false,
    motion: 'standard',
    autoFastForward: true,
  })).toBe(2200)
})

test('unread hero panel is 3000ms', () => {
  expect(revealDuration({
    wasRead: false,
    motion: 'hero',
    autoFastForward: true,
  })).toBe(3000)
})

test('read panel fast-forwards to 280ms', () => {
  expect(revealDuration({
    wasRead: true,
    motion: 'hero',
    autoFastForward: true,
  })).toBe(280)
})

test('read panel keeps normal speed when auto fast-forward is disabled', () => {
  expect(revealDuration({
    wasRead: true,
    motion: 'standard',
    autoFastForward: false,
  })).toBe(2200)
})

test('a new dialogue variant uses unread speed for the same panel', () => {
  const history = markRead({}, 'a1_fuse', 'default')

  expect(revealDuration({
    wasRead: wasRead(history, 'a1_fuse', 'cross_room'),
    motion: 'hero',
    autoFastForward: true,
  })).toBe(3000)
})
