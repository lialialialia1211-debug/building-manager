import {
  useEffect,
  useState,
} from 'react'
import { RuntimeImage } from './RuntimeImage'
import type { AssetCatalog } from '@/domain/runtime-assets'

export interface CinematicPlayerProps {
  assetIds: string[]
  catalog: AssetCatalog
  durationMs?: number
  autoPlay?: boolean
  title: string
  onFinished?(): void
}

const DEFAULT_DURATION_MS = 12000

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function CinematicPlayer({
  assetIds,
  catalog,
  durationMs = DEFAULT_DURATION_MS,
  autoPlay = true,
  title,
  onFinished,
}: CinematicPlayerProps) {
  const frameCount = Math.max(1, assetIds.length)
  const perFrame = durationMs / frameCount
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const reducedMotion = prefersReducedMotion()

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => {
      if (index >= frameCount - 1) {
        setPlaying(false)
        onFinished?.()
      } else {
        setIndex((value) => value + 1)
      }
    }, perFrame)
    return () => clearTimeout(timer)
  }, [playing, index, perFrame, frameCount, onFinished])

  const currentAssetId = assetIds[index] ?? assetIds[0] ?? ''

  return (
    <section
      className={[
        'cinematic-player',
        reducedMotion ? 'cinematic-player-reduced' : '',
      ].filter(Boolean).join(' ')}
      data-testid="cinematic-player"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-label={`${title}回想`}
    >
      <div className="cinematic-stage">
        <RuntimeImage
          key={`${currentAssetId}-${index}`}
          catalog={catalog}
          assetId={currentAssetId}
          variant="full"
          alt={`${title} 第 ${index + 1} 幀`}
          className="cinematic-frame"
        />
      </div>

      <div className="cinematic-controls">
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? '暫停' : '播放'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex(0)
            setPlaying(true)
          }}
        >
          重新播放
        </button>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => {
            setPlaying(false)
            setIndex((value) => Math.max(0, value - 1))
          }}
        >
          上一格
        </button>
        <button
          type="button"
          disabled={index >= frameCount - 1}
          onClick={() => {
            setPlaying(false)
            setIndex((value) => Math.min(frameCount - 1, value + 1))
          }}
        >
          下一格
        </button>
        <span
          className="cinematic-progress"
          aria-live="polite"
          data-testid="cinematic-progress"
        >
          {index + 1} / {frameCount}
        </span>
      </div>
    </section>
  )
}
