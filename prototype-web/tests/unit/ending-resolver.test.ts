import { expect, test } from 'vitest'
import { resolveEnding } from '@/domain/ending-resolver'
import type { EndingRule } from '@/domain/types'

const rules: EndingRule[] = [
  {
    id: 'intimacy',
    priority: 300,
    conditions: {
      allFlags: ['consent'],
      minimumStats: { trust: 4, intimacy: 3 },
    },
  },
  {
    id: 'main',
    priority: 200,
    conditions: {
      allFlags: ['clue'],
      minimumStats: { trust: 2 },
    },
  },
  { id: 'normal', priority: 100, conditions: {} },
]

test('intimacy has priority over main', () => {
  expect(
    resolveEnding(
      rules,
      { affection: 0, trust: 5, intimacy: 4 },
      { consent: true, clue: true },
    ),
  ).toBe('intimacy')
})

test('normal is the guaranteed fallback', () => {
  expect(
    resolveEnding(
      rules,
      { affection: 0, trust: 0, intimacy: 0 },
      {},
    ),
  ).toBe('normal')
})
