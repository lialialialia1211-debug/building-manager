import {
  useEffect,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
} from 'react'

export interface AssetImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  artId: string
  aspectRatio?: CSSProperties['aspectRatio']
}

export function AssetImage({
  artId,
  alt,
  aspectRatio = '4 / 3',
  className,
  ...imageProps
}: AssetImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [artId])

  if (failed) {
    return (
      <div
        className={['asset-placeholder', className].filter(Boolean).join(' ')}
        data-testid="asset-placeholder"
        style={{ aspectRatio }}
        aria-label={`${alt}（美術製作中）`}
      >
        <span>美術製作中</span>
        <code>{artId}</code>
      </div>
    )
  }

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return (
    <img
      {...imageProps}
      className={className}
      src={`${baseUrl}assets/office-comic/${encodeURIComponent(artId)}.png`}
      alt={alt}
      draggable={imageProps.draggable ?? false}
      style={{ ...imageProps.style, aspectRatio }}
      onError={(event) => {
        imageProps.onError?.(event)
        setFailed(true)
      }}
    />
  )
}
