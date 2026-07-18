import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'
import {
  assertRuntimeAssetCopyTargets,
  createRuntimeAssetPlan,
  type PlannedCopy,
} from '../../scripts/runtime-asset-plan'

const repositoryRoot = resolve(process.cwd(), '..')

function runRuntimeAssetCommand(mode: '--write' | '--check') {
  return spawnSync(process.execPath, [
    '--import',
    'tsx',
    'scripts/sync-runtime-assets.ts',
    mode,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
}

function assertCheckFailsAfter(mutate: () => void): void {
  expect(runRuntimeAssetCommand('--write').status).toBe(0)
  try {
    mutate()
    expect(runRuntimeAssetCommand('--check').status).toBe(1)
  } finally {
    expect(runRuntimeAssetCommand('--write').status).toBe(0)
    expect(runRuntimeAssetCommand('--check').status).toBe(0)
  }
}

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

test('rejects traversal copy targets before runtime assets can mutate', () => {
  const plan = createRuntimeAssetPlan(repositoryRoot)
  const originalTarget = resolve(
    repositoryRoot,
    'content/assets/common/panels/a1_fuse_master.webp',
  )
  const originalBytes = readFileSync(originalTarget)
  const traversalCopy: PlannedCopy = {
    ...plan.copies[0]!,
    id: 'a1_fuse',
    targetPath: 'content/assets/common/panels/../a1_fuse_master.webp',
  }

  expect(() => assertRuntimeAssetCopyTargets(
    repositoryRoot,
    [traversalCopy],
  )).toThrow('runtime copy target escapes common root')
  expect(readFileSync(originalTarget)).toEqual(originalBytes)
})

test('synchronizes deterministic runtime assets and manifests', () => {
  const sync = runRuntimeAssetCommand('--write')

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

  const check = runRuntimeAssetCommand('--check')
  expect(check.status).toBe(0)
  expect(check.stdout).toContain('runtime assets are in sync')
})

test('--check rejects a manifest mismatch and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    writeFileSync(
      resolve(repositoryRoot, 'content/asset-manifest.json'),
      '{"outOfSync":true}\n',
    )
  })
})

test('--check rejects a missing runtime target and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    rmSync(resolve(
      repositoryRoot,
      'content/assets/common/panels/a1_fuse_master.webp',
    ))
  })
})

test('--check rejects an unexpected runtime target and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    writeFileSync(resolve(
      repositoryRoot,
      'content/assets/common/panels/unexpected.webp',
    ), 'unexpected')
  })
})

test('--check rejects a byte-mismatched runtime target and restores the generated tree', () => {
  assertCheckFailsAfter(() => {
    copyFileSync(
      resolve(repositoryRoot,
        'content/assets/common/panels/a1_door_master.webp'),
      resolve(repositoryRoot,
        'content/assets/common/panels/a1_fuse_master.webp'),
    )
  })
})
