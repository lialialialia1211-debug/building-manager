import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  createRuntimeAssetPlan,
} from '../../scripts/runtime-asset-plan'

const repositoryRoot = resolve(process.cwd(), '..')

test('builds the complete canonical runtime asset plan', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)

  expect(Object.keys(plan.common)).toHaveLength(75)
  expect(Object.keys(plan.adult)).toEqual([
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
  expect(plan.backgrounds).toEqual({
    building_a: '/assets/common/backgrounds/building_a_master.webp',
    building_b: '/assets/common/backgrounds/building_b_master.webp',
  })
  expect(plan.common.a1_fuse).toEqual({
    preview: '/assets/common/panels/a1_fuse_preview.webp',
    full: '/assets/common/panels/a1_fuse_master.webp',
  })
  expect(plan.common.a_ending_main).toEqual({
    preview: '/assets/common/panels/a_ending_main_preview.webp',
    full: '/assets/common/panels/a_ending_main_master.webp',
  })
  expect(plan.adult.a_intimacy_01).toEqual({
    preview: '/assets/adult/a_intimacy_01_preview.webp',
    full: '/assets/adult/a_intimacy_01_master.webp',
  })
})

test('uses canonical IDs despite delivered metadata prefixes', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)

  for (const id of [
    'a1_fuse',
    'a2d_chain',
    'a4_comfort',
    'b1_glass',
    'b2n_hall',
    'b6_open',
  ]) {
    expect(plan.common[id]).toBeDefined()
    expect(plan.copies).toContainEqual(expect.objectContaining({
      id,
      sourcePath: expect.stringContaining(`${id}_preview.webp`),
      targetPath: `content/assets/common/panels/${id}_preview.webp`,
    }))
  }
})

test('plans only preview and master copies within the runtime asset roots', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)

  expect(plan.copies).toHaveLength(176)
  for (const copy of plan.copies) {
    expect(copy.sourcePath).toMatch(/art\\deliverables|art\/deliverables/)
    expect(copy.targetPath).toMatch(
      /^content\/assets\/(common|adult)\//,
    )
  }
  expect(plan.copies.filter((copy) => copy.scope === 'background'))
    .toHaveLength(2)
  expect(plan.copies.filter((copy) => copy.scope === 'common'))
    .toHaveLength(150)
  expect(plan.copies.filter((copy) => copy.scope === 'adult'))
    .toHaveLength(24)
})

test('synchronizes deterministic runtime assets and manifests', () => {
  const sync = spawnSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/sync-runtime-assets.ts',
    '--write',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  expect(sync.status).toBe(0)
  expect(sync.stdout).toContain(
    '75 common assets, 12 adult assets, 2 backgrounds',
  )
  expect(existsSync(resolve(
    repositoryRoot,
    'content/assets/common/panels/a1_fuse_master.webp',
  ))).toBe(true)
  expect(existsSync(resolve(
    repositoryRoot,
    'content/assets/adult/a_intimacy_01_master.webp',
  ))).toBe(true)
  expect(JSON.parse(readFileSync(resolve(
    repositoryRoot,
    'content/asset-manifest.json',
  ), 'utf8'))).toMatchObject({
    schemaVersion: 2,
    mode: 'playable',
    backgrounds: {
      building_a: '/assets/common/backgrounds/building_a_master.webp',
    },
    assets: {
      a1_fuse: {
        preview: '/assets/common/panels/a1_fuse_preview.webp',
      },
    },
  })
  expect(JSON.parse(readFileSync(resolve(
    repositoryRoot,
    'content/adult-asset-manifest.json',
  ), 'utf8'))).toMatchObject({
    schemaVersion: 1,
    assets: {
      a_intimacy_01: {
        full: '/assets/adult/a_intimacy_01_master.webp',
      },
    },
  })

  const check = spawnSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/sync-runtime-assets.ts',
    '--check',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  expect(check.status).toBe(0)
  expect(check.stdout).toContain('runtime assets are in sync')
})
