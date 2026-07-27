import { useState } from 'react'
import type {
  CardKind,
  ComicCard,
} from '@/domain/episode-schema'
import { AssetImage } from './AssetImage'

const tabs: Array<{ kind: CardKind; label: string }> = [
  { kind: 'character', label: '人物 5' },
  { kind: 'scene', label: '場景 4' },
  { kind: 'prop', label: '道具 4' },
]

export interface CardTrayProps {
  cards: readonly ComicCard[]
  usedCardIds: ReadonlySet<string>
  onSelect(cardId: string): void
}

export function CardTray({
  cards,
  usedCardIds,
  onSelect,
}: CardTrayProps) {
  const [activeKind, setActiveKind] = useState<CardKind>('character')
  const visibleCards = cards.filter((card) => card.kind === activeKind)

  return (
    <section className="card-tray" aria-label="故事卡牌">
      <div className="card-tray__tabs" role="tablist" aria-label="卡牌分類">
        {tabs.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            role="tab"
            aria-selected={activeKind === tab.kind}
            onClick={() => setActiveKind(tab.kind)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="card-tray__list">
        {visibleCards.map((card) => {
          const used = usedCardIds.has(card.id)
          return (
            <button
              key={card.id}
              type="button"
              className="story-card"
              aria-label={used ? `${card.title}已放入` : `加入${card.title}`}
              disabled={used}
              draggable={!used}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  'application/x-office-card',
                  JSON.stringify({ cardId: card.id }),
                )
              }}
              onClick={() => onSelect(card.id)}
            >
              <AssetImage
                artId={card.artId}
                alt=""
                aria-hidden="true"
                aspectRatio={card.kind === 'scene' ? '4 / 3' : '4 / 5'}
              />
              <span>{card.title}</span>
              <small>{used ? '已使用' : '加入分鏡'}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}
