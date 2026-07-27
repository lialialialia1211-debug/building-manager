import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ZodError } from 'zod'
import {
  parseAssetPlan,
  parseOfficeEpisode,
  validateEpisodeAssets,
} from '../src/domain/episode-schema'

export function validateContentDocuments(
  episodeInput: unknown,
  assetPlanInput: unknown,
): string[] {
  try {
    const episode = parseOfficeEpisode(episodeInput)
    const assetPlan = parseAssetPlan(assetPlanInput)
    validateEpisodeAssets(episode, assetPlan)
    return []
  } catch (error) {
    return formatValidationError(error)
  }
}

export function runContentValidation(
  contentDirectory = resolve(process.cwd(), '../content/office-comic'),
): string[] {
  try {
    const episodeInput: unknown = JSON.parse(readFileSync(
      resolve(contentDirectory, 'office-episode.json'),
      'utf8',
    ))
    const assetPlanInput: unknown = JSON.parse(readFileSync(
      resolve(contentDirectory, 'office-asset-plan.json'),
      'utf8',
    ))
    return validateContentDocuments(episodeInput, assetPlanInput)
  } catch (error) {
    return [`Unable to read content: ${errorMessage(error)}`]
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

if (isCliInvocation('validate-content.ts')) {
  const errors = runContentValidation()
  if (errors.length > 0) {
    console.error('Office comic content validation failed:')
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
  } else {
    console.log('Office comic content valid: 13 cards, 20 directed routes.')
  }
}

function isCliInvocation(filename: string): boolean {
  return process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith(`/scripts/${filename}`) ?? false
}
