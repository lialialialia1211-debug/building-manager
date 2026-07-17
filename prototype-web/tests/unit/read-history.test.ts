import { describe, expect, test } from 'vitest'
import { markRead, readKey, wasRead } from '@/domain/read-history'

describe('read history', () => {
  test('uses the default dialogue variant in a read key', () => {
    expect(readKey('a1_fuse')).toBe('a1_fuse::default')
  })

  test('keeps dialogue variants as separate history entries', () => {
    const original = {}
    const history = markRead(original, 'a1_fuse', 'safe')

    expect(history).not.toBe(original)
    expect(wasRead(history, 'a1_fuse', 'safe')).toBe(true)
    expect(wasRead(history, 'a1_fuse')).toBe(false)
  })
})
