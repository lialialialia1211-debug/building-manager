import { useCallback, useEffect, useState } from 'react'
import { RuntimeImage } from './RuntimeImage'
import type { AssetCatalog } from '@/domain/runtime-assets'

export interface OpeningSequenceProps {
  title: string
  assetIds: [string, string, string]
  dialogue: string[]
  catalog: AssetCatalog
  onComplete(): void
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest([
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    'summary',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(',')) !== null
}

export function OpeningSequence({
  title,
  assetIds,
  dialogue,
  catalog,
  onComplete,
}: OpeningSequenceProps) {
  const [frameIndex, setFrameIndex] = useState(0)
  const currentAssetId = assetIds[frameIndex] ?? assetIds[0]
  const currentDialogue = dialogue[frameIndex] ?? dialogue.at(-1)
  const isLastFrame = frameIndex === assetIds.length - 1
  const advance = useCallback(() => {
    if (isLastFrame) {
      onComplete()
      return
    }
    setFrameIndex((index) => index + 1)
  }, [isLastFrame, onComplete])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onComplete()
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (isInteractiveTarget(event.target)) return
        event.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [advance, onComplete])

  return (
    <section
      className="opening-sequence"
      aria-label={`${title}開場`}
    >
      <div className="opening-frame">
        <RuntimeImage
          assetId={currentAssetId}
          variant="full"
          catalog={catalog}
          alt={`${title}開場 ${frameIndex + 1}`}
          className="opening-image"
        />
        {currentDialogue && (
          <p
            className="opening-dialogue"
            data-testid="opening-dialogue"
          >
            {currentDialogue}
          </p>
        )}
      </div>
      <div className="opening-controls">
        <span aria-live="polite">
          {frameIndex + 1} / {assetIds.length}
        </span>
        <button type="button" onClick={advance}>
          {isLastFrame ? '繼續' : '下一張'}
        </button>
        <button type="button" onClick={onComplete}>
          跳過開場
        </button>
      </div>
    </section>
  )
}
