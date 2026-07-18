import type { DragEventHandler } from 'react'
import { RuntimeImage } from './RuntimeImage'
import type { AssetCatalog, RuntimeAssetKind } from '@/domain/runtime-assets'

interface CandidateCardProps {
  panelId: string
  previewAsset: string
  actionLabel: string
  catalog: AssetCatalog
  variant: Extract<RuntimeAssetKind, 'preview'>
  disabled: boolean
  onChoose(panelId: string): void
  selectionLabel?: string
  selected?: boolean
  draggable?: boolean
  onDragStart?: DragEventHandler<HTMLElement>
}

export function CandidateCard({
  panelId,
  previewAsset,
  actionLabel,
  catalog,
  variant,
  disabled,
  onChoose,
  selectionLabel = `選擇行動：${actionLabel}`,
  selected = false,
  draggable = false,
  onDragStart,
}: CandidateCardProps) {
  return (
    <article
      className={[
        'candidate-card',
        selected ? 'candidate-card-selected' : '',
      ].filter(Boolean).join(' ')}
      data-panel-id={panelId}
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
    >
      <RuntimeImage
        assetId={previewAsset}
        variant={variant}
        catalog={catalog}
        alt={actionLabel}
        className="candidate-card-image"
      />
      <button
        className="candidate-card-select"
        type="button"
        disabled={disabled}
        aria-label={selectionLabel}
        aria-pressed={selected}
        onClick={() => onChoose(panelId)}
      >
        {actionLabel.trim() || '選擇'}
      </button>
      {selected && (
        <span className="candidate-selected-mark">已選入</span>
      )}
    </article>
  )
}
