import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import { extname, resolve } from 'node:path'
import { ZodError } from 'zod'
import {
  parseAssetPlan,
  parseOfficeEpisode,
  validateEpisodeAssets,
} from '../src/domain/episode-schema'

export interface AssetValidationResult {
  errors: string[]
  pending: string[]
}

export function validateAssetDirectory(
  episodeInput: unknown,
  assetPlanInput: unknown,
  assetDirectory: string,
): AssetValidationResult {
  try {
    const episode = parseOfficeEpisode(episodeInput)
    const assetPlan = parseAssetPlan(assetPlanInput)
    validateEpisodeAssets(episode, assetPlan)

    const errors: string[] = []
    const pending: string[] = []
    const files = existsSync(assetDirectory)
      ? readdirSync(assetDirectory, { withFileTypes: true })
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
      : []

    for (const asset of assetPlan.assets) {
      const expectedName = `${asset.id}.png`
      const expectedPath = resolve(assetDirectory, expectedName)
      const unexpected = files.filter(
        (filename) =>
          filename.startsWith(`${asset.id}.`)
          && filename !== expectedName,
      )
      for (const filename of unexpected) {
        errors.push(
          `${asset.id}: expected .png, received ${extname(filename) || 'no extension'}`,
        )
      }

      if (!existsSync(expectedPath)) {
        pending.push(asset.id)
        continue
      }

      try {
        const dimensions = readPngDimensions(expectedPath)
        if (
          dimensions.width !== asset.width
          || dimensions.height !== asset.height
        ) {
          errors.push(
            `${asset.id}: expected ${asset.width}x${asset.height}, `
            + `received ${dimensions.width}x${dimensions.height}`,
          )
        }
      } catch (error) {
        errors.push(`${asset.id}: ${errorMessage(error)}`)
      }
    }

    return { errors, pending }
  } catch (error) {
    return {
      errors: formatValidationError(error),
      pending: [],
    }
  }
}

export function runAssetValidation(
  contentDirectory = resolve(process.cwd(), '../content'),
  assetDirectory = resolve(contentDirectory, 'assets/office-comic'),
): AssetValidationResult {
  try {
    const episodeInput: unknown = JSON.parse(readFileSync(
      resolve(contentDirectory, 'office-episode.json'),
      'utf8',
    ))
    const assetPlanInput: unknown = JSON.parse(readFileSync(
      resolve(contentDirectory, 'office-asset-plan.json'),
      'utf8',
    ))
    return validateAssetDirectory(
      episodeInput,
      assetPlanInput,
      assetDirectory,
    )
  } catch (error) {
    return {
      errors: [`Unable to read asset plan: ${errorMessage(error)}`],
      pending: [],
    }
  }
}

function readPngDimensions(path: string): {
  width: number
  height: number
} {
  const header = readFileSync(path).subarray(0, 24)
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (
    header.length < 24
    || !header.subarray(0, 8).equals(pngSignature)
    || header.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    throw new Error('file is not a readable PNG')
  }
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
  }
}

function formatValidationError(error: unknown): string[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'document'
      return `${path}: ${issue.message}`
    })
  }
  return [errorMessage(error)]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

if (isCliInvocation('validate-assets.ts')) {
  const result = runAssetValidation()
  if (result.errors.length > 0) {
    console.error('Office comic asset validation failed:')
    for (const error of result.errors) console.error(`- ${error}`)
    process.exitCode = 1
  } else {
    console.log(
      `Office comic asset plan valid. `
      + `${result.pending.length} of 87 art files pending.`,
    )
  }
}

function isCliInvocation(filename: string): boolean {
  return process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith(`/scripts/${filename}`) ?? false
}
