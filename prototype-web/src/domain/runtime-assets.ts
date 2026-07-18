import { contentUrl } from './repository'

export type RuntimeAssetKind = 'preview' | 'full'

export interface RuntimeAssetEntry {
  preview: string
  full: string
}

export interface AssetCatalog {
  common: Record<string, RuntimeAssetEntry>
  adult: Record<string, RuntimeAssetEntry> | null
  backgrounds: Record<string, string>
}

interface CommonRuntimeManifest {
  schemaVersion: 2
  mode: 'playable'
  backgrounds: Record<string, string>
  assets: Record<string, RuntimeAssetEntry>
}

interface AdultRuntimeManifest {
  schemaVersion: 1
  assets: Record<string, RuntimeAssetEntry>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
}

function readAssetEntries(
  value: unknown,
  label: string,
): Record<string, RuntimeAssetEntry> {
  if (!isRecord(value)) throw new Error(`${label} assets must be an object`)

  const assets: Record<string, RuntimeAssetEntry> = {}
  for (const [id, entry] of Object.entries(value)) {
    if (
      !isRecord(entry)
      || typeof entry.preview !== 'string'
      || typeof entry.full !== 'string'
    ) {
      throw new Error(`${label} asset ${id} must contain preview and full URLs`)
    }
    assets[id] = { preview: entry.preview, full: entry.full }
  }
  return assets
}

export function parseCommonRuntimeManifest(
  value: unknown,
): CommonRuntimeManifest {
  if (
    !isRecord(value)
    || value.schemaVersion !== 2
    || value.mode !== 'playable'
    || !isRecord(value.backgrounds)
  ) {
    throw new Error('invalid playable common asset manifest')
  }

  const backgrounds: Record<string, string> = {}
  for (const [id, url] of Object.entries(value.backgrounds)) {
    if (typeof url !== 'string') {
      throw new Error(`common background ${id} must be a URL`)
    }
    backgrounds[id] = url
  }

  return {
    schemaVersion: 2,
    mode: 'playable',
    backgrounds,
    assets: readAssetEntries(value.assets, 'common'),
  }
}

export function parseAdultRuntimeManifest(
  value: unknown,
): AdultRuntimeManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('invalid adult asset manifest')
  }

  return {
    schemaVersion: 1,
    assets: readAssetEntries(value.assets, 'adult'),
  }
}

export function createAssetCatalog(
  commonManifest: unknown,
  adultManifest: unknown | null = null,
): AssetCatalog {
  const common = parseCommonRuntimeManifest(commonManifest)
  const adult = adultManifest === null
    ? null
    : parseAdultRuntimeManifest(adultManifest)

  return {
    common: common.assets,
    adult: adult?.assets ?? null,
    backgrounds: common.backgrounds,
  }
}

export function assetUrl(
  catalog: AssetCatalog,
  id: string,
  kind: RuntimeAssetKind,
  baseUrl = import.meta.env.BASE_URL,
): string {
  const entry = catalog.common[id] ?? catalog.adult?.[id]
  return entry ? contentUrl(entry[kind], baseUrl) : ''
}
