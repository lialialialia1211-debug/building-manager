import { useCallback, useEffect, useMemo, useState } from 'react'
import { contentUrl } from '@/domain/repository'
import {
  parseAdultRuntimeManifest,
  parseCommonRuntimeManifest,
  type AssetCatalog,
  type RuntimeAssetEntry,
} from '@/domain/runtime-assets'

export interface RuntimeAssetState {
  catalog: AssetCatalog | null
  commonStatus: 'loading' | 'ready' | 'error'
  adultStatus: 'disabled' | 'loading' | 'ready' | 'error'
  retryCommon(): void
  retryAdult(): void
}

interface LoadedCommonCatalog {
  assets: Record<string, RuntimeAssetEntry>
  backgrounds: Record<string, string>
}

async function fetchManifest(path: string): Promise<unknown> {
  const response = await fetch(contentUrl(path))
  if (!response.ok) throw new Error(`${path} failed to load`)
  return response.json()
}

export function useRuntimeAssets(
  adultContent: boolean,
): RuntimeAssetState {
  const [common, setCommon] = useState<LoadedCommonCatalog | null>(null)
  const [adult, setAdult] = useState<
    Record<string, RuntimeAssetEntry> | null
  >(null)
  const [commonStatus, setCommonStatus] = useState<
    RuntimeAssetState['commonStatus']
  >('loading')
  const [adultStatus, setAdultStatus] = useState<
    RuntimeAssetState['adultStatus']
  >('disabled')
  const [commonRequest, setCommonRequest] = useState(0)
  const [adultRequest, setAdultRequest] = useState(0)

  useEffect(() => {
    let active = true
    setCommonStatus('loading')
    setCommon(null)
    setAdult(null)

    void fetchManifest('asset-manifest.json')
      .then(parseCommonRuntimeManifest)
      .then(
        (manifest) => {
          if (!active) return
          setCommon({
            assets: manifest.assets,
            backgrounds: manifest.backgrounds,
          })
          setCommonStatus('ready')
        },
        () => {
          if (!active) return
          setCommon(null)
          setAdult(null)
          setCommonStatus('error')
        },
      )

    return () => {
      active = false
    }
  }, [commonRequest])

  useEffect(() => {
    if (!adultContent) {
      setAdult(null)
      setAdultStatus('disabled')
      return
    }
    if (commonStatus !== 'ready' || !common) {
      setAdult(null)
      setAdultStatus(commonStatus === 'error' ? 'disabled' : 'loading')
      return
    }

    let active = true
    setAdultStatus('loading')
    setAdult(null)
    void fetchManifest('adult-asset-manifest.json')
      .then(parseAdultRuntimeManifest)
      .then(
        (manifest) => {
          if (!active) return
          setAdult(manifest.assets)
          setAdultStatus('ready')
        },
        () => {
          if (!active) return
          setAdult(null)
          setAdultStatus('error')
        },
      )

    return () => {
      active = false
    }
  }, [adultContent, adultRequest, common, commonStatus])

  const retryCommon = useCallback(() => {
    setCommonRequest((request) => request + 1)
  }, [])
  const retryAdult = useCallback(() => {
    if (adultContent && commonStatus === 'ready') {
      setAdultRequest((request) => request + 1)
    }
  }, [adultContent, commonStatus])

  const catalog = useMemo<AssetCatalog | null>(() => {
    if (!common) return null
    return {
      common: common.assets,
      adult: adultContent ? adult : null,
      backgrounds: common.backgrounds,
    }
  }, [adult, adultContent, common])

  return {
    catalog,
    commonStatus,
    adultStatus,
    retryCommon,
    retryAdult,
  }
}
