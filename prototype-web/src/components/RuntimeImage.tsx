import { useState } from 'react'
import {
  assetUrl,
  type AssetCatalog,
  type RuntimeAssetKind,
} from '@/domain/runtime-assets'

interface RuntimeImageProps {
  catalog: AssetCatalog
  assetId: string
  variant: RuntimeAssetKind
  alt: string
  className?: string
  draggable?: boolean
}

function resolveUrl(
  catalog: AssetCatalog,
  assetId: string,
  variant: RuntimeAssetKind,
): string | null {
  try {
    return assetUrl(catalog, assetId, variant)
  } catch {
    return null
  }
}

// Real delivered art with a retry affordance. Never falls back to greybox.
export function RuntimeImage({
  catalog,
  assetId,
  variant,
  alt,
  className,
  draggable = false,
}: RuntimeImageProps) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const baseUrl = resolveUrl(catalog, assetId, variant)

  if (!baseUrl || failed) {
    return (
      <div
        className={[
          'runtime-image',
          'runtime-image-error',
          className,
        ].filter(Boolean).join(' ')}
        role="alert"
        data-asset-id={assetId}
      >
        <p>圖片載入失敗</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            setAttempt((value) => value + 1)
          }}
        >
          重試
        </button>
      </div>
    )
  }

  const src = attempt > 0 ? `${baseUrl}?retry=${attempt}` : baseUrl

  return (
    <img
      className={['runtime-image', className].filter(Boolean).join(' ')}
      src={src}
      alt={alt}
      data-asset-id={assetId}
      draggable={draggable}
      onError={() => setFailed(true)}
    />
  )
}
