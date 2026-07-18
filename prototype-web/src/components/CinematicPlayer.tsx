import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { RuntimeImage } from './RuntimeImage'
import type { AssetCatalog } from '@/domain/runtime-assets'

const CROSSFADE_DURATION_MS = 450

export interface CinematicPlayerProps {
  assetIds: string[]
  catalog: AssetCatalog
  durationMs?: number
  autoPlay?: boolean
  title: string
  onFinished?(): void
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  return reducedMotion
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
  const reducedMotion = useReducedMotion()
  const [frameIndex, setFrameIndex] = useState(0)
  const [previousAssetId, setPreviousAssetId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(autoPlay && hasFrames)
  const [playbackGeneration, setPlaybackGeneration] = useState(0)
  const frameIndexRef = useRef(0)
  const finishedRef = useRef(false)
  const onFinishedRef = useRef(onFinished)
  const sequenceKey = `${title}\u0000${assetIds.join('\u0000')}`
  const timelineGeneration = `${sequenceKey}\u0000${playbackGeneration}`

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
    if (!previousAssetId || reducedMotion) {
      if (reducedMotion) setPreviousAssetId(null)
      return
    }
    const cleanup = window.setTimeout(
      () => setPreviousAssetId(null),
      CROSSFADE_DURATION_MS,
    )
    return () => window.clearTimeout(cleanup)
  }, [previousAssetId, reducedMotion, timelineGeneration])

  useEffect(() => {
    if (!isPlaying || !hasFrames) return

    const frameDuration = Math.max(1, durationMs / assetIds.length)
    const timer = window.setInterval(() => {
      if (frameIndexRef.current < assetIds.length - 1) {
        const previous = assetIds[frameIndexRef.current] ?? null
        setPreviousAssetId(reducedMotion ? null : previous)
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
  }, [
    durationMs,
    hasFrames,
    isPlaying,
    reducedMotion,
    timelineGeneration,
  ])

  const replay = useCallback(() => {
    if (!hasFrames) return
    finishedRef.current = false
    frameIndexRef.current = 0
    setFrameIndex(0)
    setPreviousAssetId(null)
    setIsPlaying(true)
    setPlaybackGeneration((generation) => generation + 1)
  }, [hasFrames])

  const togglePlayback = useCallback(() => {
    if (!hasFrames) return
    if (!isPlaying && frameIndex === assetIds.length - 1) {
      finishedRef.current = false
      frameIndexRef.current = 0
      setFrameIndex(0)
      setPreviousAssetId(null)
      setPlaybackGeneration((generation) => generation + 1)
    }
    setIsPlaying((playing) => !playing)
  }, [assetIds.length, frameIndex, hasFrames, isPlaying])

  const showPrevious = useCallback(() => {
    finishedRef.current = false
    const previous = assetIds[frameIndexRef.current] ?? null
    setPreviousAssetId(reducedMotion ? null : previous)
    frameIndexRef.current = Math.max(0, frameIndexRef.current - 1)
    setFrameIndex(frameIndexRef.current)
  }, [assetIds, reducedMotion])

  const showNext = useCallback(() => {
    finishedRef.current = false
    const previous = assetIds[frameIndexRef.current] ?? null
    setPreviousAssetId(reducedMotion ? null : previous)
    frameIndexRef.current = Math.min(
      assetIds.length - 1,
      frameIndexRef.current + 1,
    )
    setFrameIndex(frameIndexRef.current)
  }, [assetIds, reducedMotion])

  const currentAssetId = assetIds[frameIndex]

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
        {previousAssetId && !reducedMotion && (
          <div className="cinematic-previous-layer">
            <RuntimeImage
              key={`${timelineGeneration}-previous-${previousAssetId}`}
              assetId={previousAssetId}
              variant="full"
              catalog={catalog}
              alt=""
              className="cinematic-frame cinematic-frame-previous"
            />
          </div>
        )}
        {currentAssetId
          ? (
              <div
                key={`${timelineGeneration}-layer-${frameIndex}`}
                className="cinematic-current-layer"
                onAnimationEnd={() => setPreviousAssetId(null)}
              >
                <RuntimeImage
                  key={`${timelineGeneration}-current-${frameIndex}`}
                  assetId={currentAssetId}
                  variant="full"
                  catalog={catalog}
                  alt={`${title} ${frameIndex + 1} / ${assetIds.length}`}
                  className="cinematic-frame"
                />
              </div>
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
