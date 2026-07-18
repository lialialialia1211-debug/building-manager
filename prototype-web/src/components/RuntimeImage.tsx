import { useEffect, useState } from 'react'
import {
  assetUrl,
  type AssetCatalog,
  type RuntimeAssetKind,
} from '@/domain/runtime-assets'

export interface RuntimeImageProps {
  assetId: string
  variant: RuntimeAssetKind
  catalog: AssetCatalog
  alt: string
  className?: string
}

export function RuntimeImage({
  assetId,
  variant,
  catalog,
  alt,
  className,
}: RuntimeImageProps) {
  const source = assetUrl(catalog, assetId, variant)
  const [failed, setFailed] = useState(source === '')
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    setFailed(source === '')
    setRetryToken(0)
  }, [source])

  if (failed || source === '') {
    return (
      <div className="runtime-image-error" role="alert">
        <span>圖片載入失敗</span>
        {source !== '' && (
          <button
            type="button"
            onClick={() => {
              setRetryToken((token) => token + 1)
              setFailed(false)
            }}
          >
            重試
          </button>
        )}
      </div>
    )
  }

  const retrySource = retryToken === 0
    ? source
    : `${source}${source.includes('?') ? '&' : '?'}runtimeRetry=${retryToken}`

  return (
    <img
      className={className}
      src={retrySource}
      alt={alt}
      onError={() => setFailed(true)}
    />
  )
}
