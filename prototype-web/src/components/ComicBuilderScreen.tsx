import { useState } from 'react'
import { useStore } from 'zustand'
import type { ComicStore } from '@/app/store'
import type { RouteResolution } from '@/domain/route-resolver'
import { AssetImage } from './AssetImage'
import { CardTray } from './CardTray'
import { ComicPanelSlot } from './ComicPanelSlot'

const groups = [
  { label: '第一幕', slots: [0, 1] },
  { label: '第二幕', slots: [2] },
  { label: '第三幕', slots: [3, 4] },
  { label: '第四幕', slots: [5, 6, 7] },
] as const

function invalidMessage(resolution: RouteResolution | null): string {
  if (!resolution || resolution.kind !== 'invalid') return ''
  if (resolution.reason === 'incomplete') {
    return '還有空格。故事演不下去。'
  }
  if (resolution.reason === 'duplicate-card') {
    return '同一張臉出現兩次。影印機壞了，重排。'
  }
  if (resolution.reason === 'unknown-card') {
    return '這張卡不在劇本裡。請重新載入。'
  }
  if (resolution.characterCount === 0) {
    return '只有辦公室和道具，沒人演。重排。'
  }
  if (resolution.characterCount === 1) {
    return '一個人忙完整晚，這不是雙人漫畫。再放一個人。'
  }
  if (resolution.characterCount === 3) {
    return '三個人都想插手，四格根本演不完。留下兩個。'
  }
  return '整間公司都擠進來了。這不是尾牙，重排。'
}

export interface ComicBuilderScreenProps {
  store: ComicStore
}

export function ComicBuilderScreen({ store }: ComicBuilderScreenProps) {
  const episode = useStore(store, (state) => state.episode)
  const slots = useStore(store, (state) => state.slots)
  const resolution = useStore(store, (state) => state.resolution)
  const placeCard = useStore(store, (state) => state.placeCard)
  const moveCard = useStore(store, (state) => state.moveCard)
  const removeCard = useStore(store, (state) => state.removeCard)
  const submit = useStore(store, (state) => state.submit)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  if (!episode) return null

  const cardsById = new Map(episode.cards.map((card) => [card.id, card]))
  const usedCardIds = new Set(
    slots.flatMap((cardId) => cardId ? [cardId] : []),
  )
  const canSubmit = slots.every((cardId) => cardId !== null)
  const feedback = invalidMessage(resolution)

  const selectSlot = (index: number) => {
    if (selectedSlot === null) {
      setSelectedSlot(index)
      return
    }
    if (selectedSlot !== index) moveCard(selectedSlot, index)
    setSelectedSlot(null)
  }

  return (
    <section className="comic-builder" aria-labelledby="episode-title">
      <header className="comic-builder__header">
        <div>
          <p className="eyebrow">EPISODE 01 · OFFICE AFTER HOURS</p>
          <h1 id="episode-title">{episode.title}</h1>
        </div>
        <p>{usedCardIds.size} / 8 張卡</p>
      </header>

      <div className="comic-builder__workspace">
        <section className="comic-page" aria-label="漫畫分鏡">
          <article className="opening-panel">
            <AssetImage
              artId={episode.fixedOpeningArtId}
              alt="固定開場分鏡"
              aspectRatio="16 / 9"
            />
            <span>第 1 格 · 深夜辦公室</span>
          </article>

          <div className="slot-groups">
            {groups.map((group) => (
              <fieldset
                key={group.label}
                className={`slot-group slot-group--${group.slots.length}`}
                aria-label={group.label}
              >
                <legend>{group.label}</legend>
                <div>
                  {group.slots.map((slotIndex) => {
                    const cardId = slots[slotIndex]
                    return (
                      <ComicPanelSlot
                        key={slotIndex}
                        index={slotIndex}
                        card={cardId ? cardsById.get(cardId) ?? null : null}
                        selected={selectedSlot === slotIndex}
                        onSelect={selectSlot}
                        onRemove={(index) => {
                          removeCard(index)
                          setSelectedSlot(null)
                        }}
                        onDropCard={placeCard}
                        onMoveCard={moveCard}
                      />
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <article className="locked-panel" aria-label="第六格鎖定">
            <AssetImage
              artId="ui_locked_panel"
              alt=""
              aria-hidden="true"
              aspectRatio="4 / 5"
            />
            <strong>第六格尚未揭露</strong>
            <span>最後一格，決定今晚跟誰收尾。</span>
          </article>
        </section>

        <aside className="builder-controls">
          <CardTray
            cards={episode.cards}
            usedCardIds={usedCardIds}
            onSelect={(cardId) => placeCard(cardId)}
          />
          <p className="builder-feedback" role="status" aria-live="polite">
            {feedback || (
              canSubmit
                ? '就照這個順序演下去。'
                : '還有空格。故事演不下去。'
            )}
          </p>
          <button
            type="button"
            className="primary-action"
            disabled={!canSubmit}
            onClick={submit}
          >
            演下去
          </button>
        </aside>
      </div>
    </section>
  )
}
