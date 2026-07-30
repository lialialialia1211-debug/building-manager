import { useEffect } from 'react'
import { useStore } from 'zustand'
import type { ComicStore } from '@/app/store'
import {
  buildRevealPanels,
  getRoutePresentation,
} from '@/domain/dialogue'
import { AssetImage } from './AssetImage'
import { DialogueOverlay } from './DialogueOverlay'

export interface RevealSequenceProps {
  store: ComicStore
}

export function RevealSequence({ store }: RevealSequenceProps) {
  const episode = useStore(store, (state) => state.episode)
  const slots = useStore(store, (state) => state.slots)
  const resolution = useStore(store, (state) => state.resolution)
  const revealStep = useStore(store, (state) => state.revealStep)
  const advanceReveal = useStore(store, (state) => state.advanceReveal)
  const revealAll = useStore(store, (state) => state.revealAll)
  const returnToBuilder = useStore(store, (state) => state.returnToBuilder)

  const hasValidRoute = Boolean(
    episode && resolution && resolution.kind !== 'invalid',
  )

  useEffect(() => {
    if (!hasValidRoute || revealStep >= 4) return
    if (
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      revealAll()
      return
    }
    const timer = globalThis.setTimeout(advanceReveal, 220)
    return () => globalThis.clearTimeout(timer)
  }, [advanceReveal, hasValidRoute, revealAll, revealStep])

  if (!episode || !resolution || resolution.kind === 'invalid') return null

  const panels = buildRevealPanels(
    slots.filter((cardId): cardId is string => Boolean(cardId)),
    episode,
  )
  const cardsById = new Map(episode.cards.map((card) => [card.id, card]))
  const presentation = getRoutePresentation(resolution, episode)

  return (
    <section className="reveal-screen" aria-labelledby="reveal-title">
      <header>
        <p className="eyebrow">COMIC REVEAL</p>
        <h1 id="reveal-title">門鎖上後，沒人再照規矩來。</h1>
        <p>{presentation.title}</p>
      </header>

      <div className="reveal-grid">
        {panels.map((panel, index) => {
          const panelNumber = index + 2
          if (index >= revealStep) {
            return (
              <article
                key={panelNumber}
                className="reveal-panel reveal-panel--locked"
              >
                <strong>第 {panelNumber} 格</strong>
                <span>尚未揭露</span>
              </article>
            )
          }
          return (
            <article
              key={panelNumber}
              className="reveal-panel reveal-panel--visible"
              role="group"
              aria-label={`第 ${panelNumber} 格已揭露`}
            >
              <div className="reveal-panel__cards">
                {panel.cardIds.map((cardId) => {
                  const card = cardsById.get(cardId)
                  return card ? (
                    <AssetImage
                      key={cardId}
                      artId={card.artId}
                      alt={`${card.title}卡面`}
                    />
                  ) : null
                })}
              </div>
              <DialogueOverlay lines={panel.lines} />
            </article>
          )
        })}
      </div>

      {revealStep === 4 && (
        <article className="sixth-panel">
          <AssetImage
            artId={presentation.revealArtId}
            alt="路線 CG"
            aspectRatio="4 / 5"
          />
          <DialogueOverlay lines={presentation.revealDialogue} />
        </article>
      )}

      <footer className="reveal-actions">
        <button type="button" onClick={returnToBuilder}>回去重排</button>
        <button
          type="button"
          className="primary-action"
          onClick={advanceReveal}
          hidden={revealStep < 4}
        >
          閱讀後續
        </button>
        {revealStep < 4 && (
          <p className="reveal-progress" role="status" aria-live="polite">
            正在揭露第 {revealStep + 2} 格…
          </p>
        )}
      </footer>
    </section>
  )
}
