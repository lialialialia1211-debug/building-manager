import type { ComicCard } from '@/domain/episode-schema'
import { AssetImage } from './AssetImage'

interface DragPayload {
  cardId: string
  fromIndex?: number
}

export interface ComicPanelSlotProps {
  index: number
  card: ComicCard | null
  hint?: string
  selected: boolean
  onSelect(index: number): void
  onRemove(index: number): void
  onDropCard(cardId: string, index: number): void
  onMoveCard(fromIndex: number, toIndex: number): void
}

export function ComicPanelSlot({
  index,
  card,
  hint,
  selected,
  onSelect,
  onRemove,
  onDropCard,
  onMoveCard,
}: ComicPanelSlotProps) {
  const slotNumber = index + 1

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData('application/x-office-card')
    try {
      const payload = JSON.parse(raw) as DragPayload
      if (typeof payload.fromIndex === 'number') {
        onMoveCard(payload.fromIndex, index)
      } else if (payload.cardId) {
        onDropCard(payload.cardId, index)
      }
    } catch {
      // Ignore unrelated drag data.
    }
  }

  if (!card) {
    return (
      <article
        className="comic-slot comic-slot--empty"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <button
          type="button"
          aria-label={`第 ${slotNumber} 格：空格`}
          onClick={() => onSelect(index)}
        >
          <span className="comic-slot__add" aria-hidden="true">＋</span>
          <small>第 {slotNumber} 格</small>
          {hint && (
            <span className="comic-slot__hint">{hint}</span>
          )}
        </button>
      </article>
    )
  }

  return (
    <article
      className={`comic-slot${selected ? ' comic-slot--selected' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <button
        type="button"
        className="comic-slot__card"
        aria-label={`第 ${slotNumber} 格：${card.title}`}
        aria-pressed={selected}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(
            'application/x-office-card',
            JSON.stringify({ cardId: card.id, fromIndex: index }),
          )
        }}
        onClick={() => onSelect(index)}
      >
        <AssetImage artId={card.artId} alt="" aria-hidden="true" />
        <strong>{card.title}</strong>
      </button>
      <button
        type="button"
        className="comic-slot__remove"
        aria-label={`移除第 ${slotNumber} 格`}
        onClick={() => onRemove(index)}
      >
        移除
      </button>
    </article>
  )
}
