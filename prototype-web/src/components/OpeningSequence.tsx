import { useState, type KeyboardEvent } from 'react'
import { RuntimeImage } from './RuntimeImage'
import type { AssetCatalog } from '@/domain/runtime-assets'

interface OpeningSequenceProps {
  title: string
  assetIds: readonly string[]
  dialogue: readonly string[]
  catalog: AssetCatalog
  onComplete(): void
}

export function OpeningSequence({
  title,
  assetIds,
  dialogue,
  catalog,
  onComplete,
}: OpeningSequenceProps) {
  const [index, setIndex] = useState(0)
  const total = assetIds.length
  const isLast = index >= total - 1

  const advance = (): void => {
    if (isLast) {
      onComplete()
      return
    }
    setIndex((value) => Math.min(total - 1, value + 1))
  }

  const caption =
    dialogue[index] ?? dialogue[dialogue.length - 1] ?? ''

  const handleKeyDown = (
    event: KeyboardEvent<HTMLElement>,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      advance()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onComplete()
    }
  }

  return (
    <section
      className="opening-sequence"
      data-testid="opening-sequence"
      aria-labelledby="opening-title"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <header className="opening-header">
        <p className="opening-kicker">事件開場</p>
        <h1 id="opening-title">{title}</h1>
        <p className="opening-progress" aria-live="polite">
          {index + 1} / {total}
        </p>
      </header>

      <figure className="opening-frame">
        <RuntimeImage
          catalog={catalog}
          assetId={assetIds[index] ?? assetIds[0] ?? ''}
          variant="full"
          alt={`開場分鏡 ${index + 1}`}
          className="opening-image"
        />
        {caption && (
          <figcaption className="opening-caption">
            {caption}
          </figcaption>
        )}
      </figure>

      <div className="opening-actions">
        <button
          className="opening-skip"
          type="button"
          onClick={onComplete}
        >
          跳過開場
        </button>
        <button
          className="opening-next"
          type="button"
          onClick={advance}
        >
          {isLast ? '進入房間' : '下一張'}
        </button>
      </div>
    </section>
  )
}
