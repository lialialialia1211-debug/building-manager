import { useCallback, useEffect, useRef, useState } from 'react'
import {
  readAdultManifest,
  readCommonManifest,
  withBase,
  type AssetCatalog,
} from '@/domain/runtime-assets'

export type CommonStatus = 'loading' | 'ready' | 'error'
export type AdultStatus = 'disabled' | 'loading' | 'ready' | 'error'

export interface RuntimeAssetState {
  catalog: AssetCatalog | null
  commonStatus: CommonStatus
  adultStatus: AdultStatus
  retryCommon(): void
  retryAdult(): void
}

const COMMON_MANIFEST = 'asset-manifest.json'
const ADULT_MANIFEST = 'adult-asset-manifest.json'

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(withBase(`/${path}`))
  if (!response.ok) {
    throw new Error(`failed to load ${path}`)
  }
  return response.json()
}

export function useRuntimeAssets(
  adultContent: boolean,
): RuntimeAssetState {
  const [catalog, setCatalog] = useState<AssetCatalog | null>(null)
  const [commonStatus, setCommonStatus] =
    useState<CommonStatus>('loading')
  const [adultStatus, setAdultStatus] = useState<AdultStatus>(
    adultContent ? 'loading' : 'disabled',
  )
  const [commonAttempt, setCommonAttempt] = useState(0)
  const [adultAttempt, setAdultAttempt] = useState(0)

  const activeCommon = useRef(0)
  const activeAdult = useRef(0)

  useEffect(() => {
    const token = ++activeCommon.current
    setCommonStatus('loading')

    void fetchJson(COMMON_MANIFEST).then(
      (value) => {
        if (token !== activeCommon.current) return
        try {
          const { assets, backgrounds } = readCommonManifest(value)
          setCatalog((previous) => ({
            common: assets,
            backgrounds,
            adult: previous?.adult ?? null,
          }))
          setCommonStatus('ready')
        } catch {
          setCommonStatus('error')
        }
      },
      () => {
        if (token !== activeCommon.current) return
        setCommonStatus('error')
      },
    )
  }, [commonAttempt])

  useEffect(() => {
    if (!adultContent) {
      activeAdult.current += 1
      setAdultStatus('disabled')
      setCatalog((previous) =>
        previous && previous.adult
          ? { ...previous, adult: null }
          : previous)
      return
    }

    const token = ++activeAdult.current
    setAdultStatus('loading')

    void fetchJson(ADULT_MANIFEST).then(
      (value) => {
        if (token !== activeAdult.current) return
        try {
          const { assets } = readAdultManifest(value)
          setCatalog((previous) =>
            previous
              ? { ...previous, adult: assets }
              : { common: {}, backgrounds: {}, adult: assets })
          setAdultStatus('ready')
        } catch {
          setAdultStatus('error')
        }
      },
      () => {
        if (token !== activeAdult.current) return
        setAdultStatus('error')
      },
    )
  }, [adultContent, adultAttempt])

  const retryCommon = useCallback(() => {
    setCommonAttempt((attempt) => attempt + 1)
  }, [])
  const retryAdult = useCallback(() => {
    setAdultAttempt((attempt) => attempt + 1)
  }, [])

  return {
    catalog,
    commonStatus,
    adultStatus,
    retryCommon,
    retryAdult,
  }
}
