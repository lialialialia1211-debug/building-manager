import { useState } from 'react'
import { useStore } from 'zustand'
import type { ComicStore } from '@/app/store'
import type { RouteResolution } from '@/domain/route-resolver'
import { AssetImage } from './AssetImage'
import { CardTray } from './CardTray'
import { ComicPanelSlot } from './ComicPanelSlot'

const slotConfigs = [
  { index: 0, label: '第一格', hint: '主線似乎需要兩名人物' },
  { index: 1, label: '第二格' },
  { index: 2, label: '第三格', hint: '再放入一個場景與一件關鍵物品' },
  { index: 3, label: '第四格' },
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
  if (resolution.reason === 'route-data') {
    return '這組人物的支線資料缺漏，請更換人物或調整順序。'
  }
  if (resolution.characterCount === 0) {
    return '至少需要兩名人物。先從牌庫選兩個人，再調整格子順序。'
  }
  if (resolution.characterCount === 1) {
    return '至少需要兩名人物。請再選一名人物，或調整格子順序。'
  }
  return '這組編排無法成線，請更換卡片或調整順序。'
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
      <header className="comic-builder__header" aria-label="劇集狀態">
        <div>
          <p className="eyebrow">EPISODE 01 · OFFICE AFTER HOURS</p>
          <h1 id="episode-title">{episode.title}</h1>
        </div>
        <p>{usedCardIds.size} / 4 張卡</p>
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
            {slotConfigs.map((config) => {
              const cardId = slots[config.index]
              return (
              <fieldset
                key={config.label}
                className="slot-group slot-group--1"
                aria-label={config.label}
              >
                <legend>{config.label}</legend>
                <div>
                  <ComicPanelSlot
                    index={config.index}
                    card={cardId ? cardsById.get(cardId) ?? null : null}
                    hint={'hint' in config ? config.hint : undefined}
                    selected={selectedSlot === config.index}
                    onSelect={selectSlot}
                    onRemove={(index) => {
                      removeCard(index)
                      setSelectedSlot(null)
                    }}
                    onDropCard={placeCard}
                    onMoveCard={moveCard}
                  />
                </div>
              </fieldset>
              )
            })}
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

        <aside
          className="builder-controls"
          role="region"
          aria-label="編排操作"
        >
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
