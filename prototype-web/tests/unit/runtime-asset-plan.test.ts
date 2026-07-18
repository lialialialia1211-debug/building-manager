import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  createRuntimeAssetPlan,
} from '../../scripts/runtime-asset-plan'

const repoRoot = resolve(process.cwd(), '..')
const plan = createRuntimeAssetPlan(repoRoot)

const metadataPrefixIds = [
  'a1_fuse',
  'a2d_chain',
  'a4_comfort',
  'b1_glass',
  'b2n_hall',
  'b6_open',
]

test('common panels are exactly the 75 runtime ids', () => {
  const ids = Object.keys(plan.common)
  expect(ids).toHaveLength(75)

  const choice = ids.filter(
    (id) =>
      !id.startsWith('a_open_')
      && !id.startsWith('b_open_')
      && !id.startsWith('a_ending_')
      && !id.startsWith('b_ending_')
      && !id.includes('_safe_')
      && !id.startsWith('sixth_'),
  )
  expect(choice).toHaveLength(48)
  expect(ids.filter((id) => id.includes('_open_'))).toHaveLength(6)
  expect(ids.filter((id) => id.includes('_ending_'))).toHaveLength(6)
  expect(ids.filter((id) => id.includes('_safe_'))).toHaveLength(12)
  expect(ids.filter((id) => id.startsWith('sixth_'))).toHaveLength(3)
})

test('adult panels are exactly the 12 canonical intimacy ids', () => {
  const ids = Object.keys(plan.adult).sort()
  expect(ids).toEqual([
    'a_intimacy_01',
    'a_intimacy_02',
    'a_intimacy_03',
    'a_intimacy_04',
    'a_intimacy_05',
    'a_intimacy_06',
    'b_intimacy_01',
    'b_intimacy_02',
    'b_intimacy_03',
    'b_intimacy_04',
    'b_intimacy_05',
    'b_intimacy_06',
  ])
})

test('defines two backgrounds with runtime urls', () => {
  expect(Object.keys(plan.backgrounds).sort()).toEqual([
    'bg_room_a',
    'bg_room_b',
  ])
  for (const url of Object.values(plan.backgrounds)) {
    expect(url).toMatch(/^\/assets\/common\/backgrounds\//)
  }
})

test('every common panel has preview and full urls under common', () => {
  for (const entry of Object.values(plan.common)) {
    expect(entry.preview).toMatch(
      /^\/assets\/common\/panels\/.+_preview\.webp$/,
    )
    expect(entry.full).toMatch(
      /^\/assets\/common\/panels\/.+_master\.webp$/,
    )
  }
})

test('adult urls are isolated under /assets/adult', () => {
  for (const entry of Object.values(plan.adult)) {
    expect(entry.preview).toMatch(/^\/assets\/adult\//)
    expect(entry.full).toMatch(/^\/assets\/adult\//)
  }
  for (const entry of Object.values(plan.common)) {
    expect(entry.preview).not.toContain('/adult/')
    expect(entry.full).not.toContain('/adult/')
  }
})

test('all copy targets live under content/assets and sources exist', () => {
  for (const copy of plan.copies) {
    expect(copy.targetPath.startsWith('content/assets/')).toBe(true)
    expect(existsSync(resolve(repoRoot, copy.sourcePath))).toBe(true)
  }
})

test('metadata prefix quirks do not affect canonical ids', () => {
  for (const id of metadataPrefixIds) {
    const inCommon = id in plan.common
    expect(inCommon).toBe(true)
    const meta = JSON.parse(
      readFileSync(
        resolve(
          repoRoot,
          'art/deliverables/panels',
          id.startsWith('a') ? 'room_a' : 'room_b',
          `${id}_meta.json`,
        ),
        'utf8',
      ),
    ) as { asset_id: string }
    expect(meta.asset_id).toBe(id)
  }
})
