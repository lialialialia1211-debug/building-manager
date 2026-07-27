import { useEffect, useMemo, useState } from 'react'
import { useStore } from 'zustand'
import type { ComicStore } from '@/app/store'
import { getRoutePresentation } from '@/domain/dialogue'
import { AssetImage } from './AssetImage'
import { DialogueOverlay } from './DialogueOverlay'

export interface EndingReaderProps {
  store: ComicStore
}

export function EndingReader({ store }: EndingReaderProps) {
  const episode = useStore(store, (state) => state.episode)
  const resolution = useStore(store, (state) => state.resolution)
  const returnToBuilder = useStore(store, (state) => state.returnToBuilder)
  const [pageIndex, setPageIndex] = useState(0)

  const presentation = useMemo(() => {
    if (!episode || !resolution || resolution.kind === 'invalid') return null
    return getRoutePresentation(resolution, episode)
  }, [episode, resolution])

  useEffect(() => {
    setPageIndex(0)
  }, [presentation?.title])

  if (!presentation) return null

  const pages = chunk(presentation.endingFrames, 4)
  const page = pages[pageIndex] ?? []

  return (
    <section className="ending-reader" aria-labelledby="ending-title">
      <header>
        <p className="eyebrow">ENDING UNLOCKED</p>
        <h1 id="ending-title">{presentation.title}</h1>
        <p>第 {pageIndex + 1} / {pages.length} 頁</p>
      </header>

      <div className="ending-page">
        {page.map((frame, index) => {
          const frameNumber = pageIndex * 4 + index + 1
          return (
            <figure key={frame.artId}>
              <AssetImage
                artId={frame.artId}
                alt={`結局分鏡 ${frameNumber}`}
                aspectRatio={index === 0 && pages.length === 1
                  ? '4 / 5'
                  : '4 / 3'}
              />
              <DialogueOverlay lines={frame.lines} maxLines={3} />
              <figcaption>{String(frameNumber).padStart(2, '0')}</figcaption>
            </figure>
          )
        })}
      </div>

      <footer className="ending-actions">
        <button type="button" onClick={returnToBuilder}>回到編排</button>
        <div>
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            上一頁
          </button>
          <button
            type="button"
            disabled={pageIndex === pages.length - 1}
            onClick={() => setPageIndex(
              (current) => Math.min(pages.length - 1, current + 1),
            )}
          >
            下一頁
          </button>
        </div>
      </footer>
    </section>
  )
}

function chunk<T>(values: readonly T[], size: number): T[][] {
  const pages: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    pages.push(values.slice(index, index + size))
  }
  return pages
}
