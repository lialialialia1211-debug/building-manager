import { expect, test } from 'vitest'
import { resolveAsset } from '@/domain/asset-resolver'

test('safe mode prefers the safe asset', () => {
  expect(resolveAsset({
    default: '/assets/default.webp',
    adult: '/assets/adult/ending.webp',
    safe: '/assets/safe/ending.webp',
  }, false)).toBe('/assets/safe/ending.webp')
})

test('safe mode rejects an adult path hidden in the default fallback', () => {
  expect(resolveAsset({
    default: '/assets/adult/fallback.webp',
    adult: '/assets/adult/ending.webp',
  }, false)).toBe('')
})

test('safe mode can use a non-adult default when no safe asset exists', () => {
  expect(resolveAsset({
    default: '/assets/endings/default.webp',
    adult: '/assets/adult/ending.webp',
  }, false)).toBe('/assets/endings/default.webp')
})

test('adult mode prefers the adult asset', () => {
  expect(resolveAsset({
    default: '/assets/default.webp',
    adult: '/assets/adult/ending.webp',
    safe: '/assets/safe/ending.webp',
  }, true)).toBe('/assets/adult/ending.webp')
})
