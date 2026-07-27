import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  readAdultManifest,
  readCommonManifest,
  type AssetCatalog,
} from '@/domain/runtime-assets'

function read(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), relativePath), 'utf8'),
  )
}

// Build a real AssetCatalog from the committed runtime manifests so component
// tests exercise the same id -> url resolution as production.
export function makeTestCatalog(
  { adult = true }: { adult?: boolean } = {},
): AssetCatalog {
  const common = readCommonManifest(
    read('../content/asset-manifest.json'),
  )
  const adultData = readAdultManifest(
    read('../content/adult-asset-manifest.json'),
  )
  return {
    common: common.assets,
    backgrounds: common.backgrounds,
    adult: adult ? adultData.assets : null,
  }
}
