import { ZodError } from 'zod'
import {
  parseOfficeEpisode,
  type OfficeEpisode,
} from './episode-schema'

export type EpisodeLoadErrorKind = 'network' | 'content'

export class EpisodeLoadError extends Error {
  readonly kind: EpisodeLoadErrorKind

  constructor(kind: EpisodeLoadErrorKind, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'EpisodeLoadError'
    this.kind = kind
  }
}

export async function fetchOfficeEpisode(
  signal?: AbortSignal,
  fetcher: typeof fetch = globalThis.fetch,
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<OfficeEpisode> {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  let response: Response
  try {
    response = await fetcher(
      `${normalizedBaseUrl}office-episode.json`,
      { signal },
    )
  } catch (error) {
    throw new EpisodeLoadError(
      'network',
      '無法載入劇本，請檢查連線後重試。',
      error,
    )
  }

  if (!response.ok) {
    throw new EpisodeLoadError(
      'network',
      `無法載入劇本（HTTP ${response.status}）。`,
    )
  }

  try {
    const input: unknown = await response.json()
    return parseOfficeEpisode(input)
  } catch (error) {
    const detail = error instanceof ZodError
      ? error.issues[0]?.message
      : undefined
    throw new EpisodeLoadError(
      'content',
      detail
        ? `劇本格式錯誤：${detail}`
        : '劇本不是有效的 JSON。',
      error,
    )
  }
}
