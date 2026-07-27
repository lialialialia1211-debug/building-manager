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
  const returnToBuilder = useStore(store, (state) => state.returnToBuilder)

  if (!episode || !resolution || resolution.kind === 'invalid') return null

  const panels = buildRevealPanels(
    slots.filter((cardId): cardId is string => Boolean(cardId)),
    episode,
  )
  const cardsById = new Map(episode.cards.map((card) => [card.id, card]))
  const presentation = getRoutePresentation(resolution, episode)
  const nextPanelNumber = revealStep + 2

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
            alt="第六格結局分鏡"
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
        >
          {revealStep === 4
            ? '閱讀結局'
            : `揭露第 ${nextPanelNumber} 格`}
        </button>
      </footer>
    </section>
  )
}
