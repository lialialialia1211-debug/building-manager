import { useCallback, useEffect, useRef, useState } from 'react'
import { RuntimeImage } from './RuntimeImage'
import {
  assetUrl,
  type AssetCatalog,
} from '@/domain/runtime-assets'

export interface CinematicPlayerProps {
  assetIds: string[]
  catalog: AssetCatalog
  durationMs?: number
  autoPlay?: boolean
  title: string
  onFinished?(): void
}

export function CinematicPlayer({
  assetIds,
  catalog,
  durationMs = 12_000,
  autoPlay = true,
  title,
  onFinished,
}: CinematicPlayerProps) {
  const hasFrames = assetIds.length > 0
  const [frameIndex, setFrameIndex] = useState(0)
  const [previousAssetId, setPreviousAssetId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(
    autoPlay && hasFrames,
  )
  const frameIndexRef = useRef(0)
  const finishedRef = useRef(false)
  const onFinishedRef = useRef(onFinished)
  const sequenceKey = `${title}\u0000${assetIds.join('\u0000')}`

  useEffect(() => {
    onFinishedRef.current = onFinished
  }, [onFinished])

  useEffect(() => {
    frameIndexRef.current = 0
    setFrameIndex(0)
    setPreviousAssetId(null)
    setIsPlaying(autoPlay && hasFrames)
    finishedRef.current = false
  }, [autoPlay, hasFrames, sequenceKey])

  useEffect(() => {
    if (!isPlaying || !hasFrames) return

    const frameDuration = Math.max(1, durationMs / assetIds.length)
    const timer = window.setInterval(() => {
      if (frameIndexRef.current < assetIds.length - 1) {
        setPreviousAssetId(assetIds[frameIndexRef.current] ?? null)
        frameIndexRef.current += 1
        setFrameIndex(frameIndexRef.current)
        return
      }

      setIsPlaying(false)
      if (!finishedRef.current) {
        finishedRef.current = true
        onFinishedRef.current?.()
      }
    }, frameDuration)

    return () => window.clearInterval(timer)
  }, [assetIds.length, durationMs, hasFrames, isPlaying])

  const replay = useCallback(() => {
    if (!hasFrames) return
    finishedRef.current = false
    frameIndexRef.current = 0
    setFrameIndex(0)
    setPreviousAssetId(null)
    setIsPlaying(true)
  }, [hasFrames])

  const togglePlayback = useCallback(() => {
    if (!hasFrames) return
    if (!isPlaying && frameIndex === assetIds.length - 1) {
      finishedRef.current = false
      frameIndexRef.current = 0
      setFrameIndex(0)
      setPreviousAssetId(null)
    }
    setIsPlaying((playing) => !playing)
  }, [assetIds.length, frameIndex, hasFrames, isPlaying])

  const showPrevious = useCallback(() => {
    finishedRef.current = false
    setPreviousAssetId(assetIds[frameIndexRef.current] ?? null)
    frameIndexRef.current = Math.max(0, frameIndexRef.current - 1)
    setFrameIndex(frameIndexRef.current)
  }, [assetIds])

  const showNext = useCallback(() => {
    finishedRef.current = false
    setPreviousAssetId(assetIds[frameIndexRef.current] ?? null)
    frameIndexRef.current = Math.min(
      assetIds.length - 1,
      frameIndexRef.current + 1,
    )
    setFrameIndex(frameIndexRef.current)
  }, [assetIds])

  const currentAssetId = assetIds[frameIndex]
  const previousSource = previousAssetId
    ? assetUrl(catalog, previousAssetId, 'full')
    : ''

  return (
    <section
      className="cinematic-player"
      aria-label={title}
      data-reduced-motion-safe="true"
    >
      <div
        className="cinematic-stage"
        data-testid="cinematic-stage"
        data-asset-id={currentAssetId}
      >
        {previousSource && (
          <img
            className="cinematic-frame cinematic-frame-previous"
            src={previousSource}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        )}
        {currentAssetId
          ? (
              <RuntimeImage
                key={`${sequenceKey}-${frameIndex}`}
                assetId={currentAssetId}
                variant="full"
                catalog={catalog}
                alt={`${title} ${frameIndex + 1} / ${assetIds.length}`}
                className="cinematic-frame"
              />
            )
          : (
              <p className="cinematic-empty" role="status">
                沒有可播放的回想
              </p>
            )}
      </div>

      <div className="cinematic-controls">
        <span className="cinematic-counter" aria-live="polite">
          {hasFrames ? frameIndex + 1 : 0} / {assetIds.length}
        </span>
        <button
          type="button"
          onClick={showPrevious}
          disabled={!hasFrames || frameIndex === 0}
        >
          上一格
        </button>
        <button
          type="button"
          onClick={togglePlayback}
          disabled={!hasFrames}
        >
          {isPlaying ? '暫停' : '播放'}
        </button>
        <button
          type="button"
          onClick={showNext}
          disabled={!hasFrames || frameIndex === assetIds.length - 1}
        >
          下一格
        </button>
        <button type="button" onClick={replay} disabled={!hasFrames}>
          重播
        </button>
      </div>
    </section>
  )
}
