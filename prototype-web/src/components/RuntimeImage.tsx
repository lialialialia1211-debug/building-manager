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
  onRetry?(): void
}

export function RuntimeImage({
  assetId,
  variant,
  catalog,
  alt,
  className,
  onRetry,
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
      <div
        className={[
          'runtime-image-error',
          className,
        ].filter(Boolean).join(' ')}
        role="alert"
      >
        <span>圖片載入失敗</span>
        {(source !== '' || onRetry) && (
          <button
            type="button"
            onClick={() => {
              if (source === '') {
                onRetry?.()
                return
              }
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
