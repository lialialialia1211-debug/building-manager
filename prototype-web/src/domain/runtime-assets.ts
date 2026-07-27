import {
  buildRequiredCommonPanelIds,
  validateAdultManifest,
  validatePlayableManifest,
  type RuntimePlayableEntry,
} from './asset-manifest'

export type RuntimeAssetKind = 'preview' | 'full'

export interface AssetCatalog {
  common: Record<string, RuntimePlayableEntry>
  adult: Record<string, RuntimePlayableEntry> | null
  backgrounds: Record<string, string>
}

export interface CommonManifestData {
  backgrounds: Record<string, string>
  assets: Record<string, RuntimePlayableEntry>
}

export interface AdultManifestData {
  assets: Record<string, RuntimePlayableEntry>
}

function baseUrlPath(): string {
  return import.meta.env.BASE_URL ?? '/'
}

// Combine a Vite base ("/", "/building-manager/") with a manifest path
// ("/assets/..."), never hard-coding a GitHub Pages URL.
export function withBase(
  path: string,
  base = baseUrlPath(),
): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${path.replace(/^\/+/, '')}`
}

function lookup(
  catalog: AssetCatalog,
  assetId: string,
): RuntimePlayableEntry {
  const entry = catalog.common[assetId] ?? catalog.adult?.[assetId]
  if (!entry) {
    throw new Error(`unknown asset id: ${assetId}`)
  }
  return entry
}

export function assetUrl(
  catalog: AssetCatalog,
  assetId: string,
  variant: RuntimeAssetKind,
  base = baseUrlPath(),
): string {
  const entry = lookup(catalog, assetId)
  return withBase(variant === 'full' ? entry.full : entry.preview, base)
}

export function hasAsset(
  catalog: AssetCatalog,
  assetId: string,
): boolean {
  return (
    assetId in catalog.common
    || Boolean(catalog.adult && assetId in catalog.adult)
  )
}

export function backgroundUrl(
  catalog: AssetCatalog,
  backgroundId: string,
  base = baseUrlPath(),
): string {
  const path = catalog.backgrounds[backgroundId]
  if (!path) {
    throw new Error(`unknown background id: ${backgroundId}`)
  }
  return withBase(path, base)
}

export function parseCommonManifest(
  value: unknown,
  choicePanelIds: readonly string[],
): CommonManifestData {
  const { errors } = validatePlayableManifest(
    value,
    buildRequiredCommonPanelIds(choicePanelIds),
  )
  if (errors.length > 0) {
    throw new Error(`invalid common manifest: ${errors.join('; ')}`)
  }
  const manifest = value as CommonManifestData
  return {
    backgrounds: manifest.backgrounds,
    assets: manifest.assets,
  }
}

export function parseAdultManifest(value: unknown): AdultManifestData {
  const { errors } = validateAdultManifest(value)
  if (errors.length > 0) {
    throw new Error(`invalid adult manifest: ${errors.join('; ')}`)
  }
  return { assets: (value as AdultManifestData).assets }
}

function isEntryRecord(
  value: unknown,
): value is Record<string, RuntimePlayableEntry> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every(
    (entry) =>
      typeof entry === 'object'
      && entry !== null
      && typeof (entry as RuntimePlayableEntry).preview === 'string'
      && typeof (entry as RuntimePlayableEntry).full === 'string',
  )
}

// Lenient runtime readers used after the build-time validators have already
// enforced counts, ids and adult isolation via validate:assets.
export function readCommonManifest(value: unknown): CommonManifestData {
  if (
    typeof value !== 'object'
    || value === null
    || (value as { schemaVersion?: unknown }).schemaVersion !== 2
    || !isEntryRecord((value as CommonManifestData).assets)
  ) {
    throw new Error('malformed common manifest')
  }
  const manifest = value as CommonManifestData
  return {
    backgrounds: manifest.backgrounds ?? {},
    assets: manifest.assets,
  }
}

export function readAdultManifest(value: unknown): AdultManifestData {
  if (
    typeof value !== 'object'
    || value === null
    || !isEntryRecord((value as AdultManifestData).assets)
  ) {
    throw new Error('malformed adult manifest')
  }
  return { assets: (value as AdultManifestData).assets }
}
