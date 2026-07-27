import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach } from 'vitest'
import { validateAssetDirectory } from '../scripts/validate-assets'
import { validateContentDocuments } from '../scripts/validate-content'

const episode = JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-episode.json'),
  'utf8',
)) as Record<string, unknown>
const assetPlan = JSON.parse(readFileSync(
  resolve(process.cwd(), '../content/office-asset-plan.json'),
  'utf8',
)) as Record<string, unknown>

const temporaryDirectories: string[] = []

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'office-comic-assets-'))
  temporaryDirectories.push(directory)
  return directory
}

function pngHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(24)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header, 0)
  header.write('IHDR', 12, 'ascii')
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  return header
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('content validator', () => {
  it('accepts the checked-in content documents', () => {
    expect(validateContentDocuments(episode, assetPlan)).toEqual([])
  })

  it('rejects malformed content and incomplete pair coverage', () => {
    const malformed = { schemaVersion: 99 }
    const incomplete = structuredClone(episode) as {
      sideRoutes: unknown[]
    }
    incomplete.sideRoutes.pop()

    expect(validateContentDocuments(malformed, assetPlan).join('\n'))
      .toMatch(/schemaVersion|invalid input/i)
    expect(validateContentDocuments(incomplete, assetPlan).join('\n'))
      .toMatch(/all 20 directed character pairs/i)
  })

  it('rejects duplicate plans and unknown art references', () => {
    const duplicatePlan = structuredClone(assetPlan) as {
      assets: Array<{ id: string }>
    }
    duplicatePlan.assets[1]!.id = duplicatePlan.assets[0]!.id
    const unknownReference = {
      ...structuredClone(episode),
      fixedOpeningArtId: 'not_in_the_plan',
    }

    expect(validateContentDocuments(episode, duplicatePlan).join('\n'))
      .toMatch(/asset ids must be unique/i)
    expect(validateContentDocuments(unknownReference, assetPlan).join('\n'))
      .toMatch(/unknown art id: not_in_the_plan/i)
  })
})

describe('asset validator', () => {
  it('reports absent planned art as pending rather than an error', () => {
    const result = validateAssetDirectory(
      episode,
      assetPlan,
      createTemporaryDirectory(),
    )

    expect(result.errors).toEqual([])
    expect(result.pending).toHaveLength(87)
  })

  it('rejects unexpected extensions for a planned art id', () => {
    const directory = createTemporaryDirectory()
    writeFileSync(
      join(directory, 'card_char_male_rover.webp'),
      Buffer.from('not a png'),
    )

    const result = validateAssetDirectory(episode, assetPlan, directory)

    expect(result.errors.join('\n')).toMatch(
      /card_char_male_rover.*expected \.png/i,
    )
  })

  it('rejects present PNG files with wrong dimensions', () => {
    const directory = createTemporaryDirectory()
    writeFileSync(
      join(directory, 'card_char_male_rover.png'),
      pngHeader(100, 100),
    )

    const result = validateAssetDirectory(episode, assetPlan, directory)

    expect(result.errors.join('\n')).toMatch(
      /card_char_male_rover.*expected 1638x2048.*received 100x100/i,
    )
  })

  it('rejects invalid dimensions in the art plan', () => {
    const invalidPlan = structuredClone(assetPlan) as {
      assets: Array<{ width: number }>
    }
    invalidPlan.assets[0]!.width = 0

    const result = validateAssetDirectory(
      episode,
      invalidPlan,
      createTemporaryDirectory(),
    )

    expect(result.errors.join('\n')).toMatch(/too small|greater than 0/i)
  })
})
