import { RuntimeImage } from './RuntimeImage'
import type {
  AssetCatalog,
  RuntimeAssetKind,
} from '@/domain/runtime-assets'

interface CandidateCardProps {
  panelId: string
  actionLabel: string
  catalog: AssetCatalog
  variant?: RuntimeAssetKind
  disabled: boolean
  onChoose(panelId: string): void
}

// The preview image (with its own retry button) and the choose button are
// siblings inside an article so interactive controls are never nested.
export function CandidateCard({
  panelId,
  actionLabel,
  catalog,
  variant = 'preview',
  disabled,
  onChoose,
}: CandidateCardProps) {
  return (
    <article className="candidate-card">
      <RuntimeImage
        catalog={catalog}
        assetId={panelId}
        variant={variant}
        alt=""
        className="candidate-card-image"
      />
      <button
        className="candidate-card-choose"
        type="button"
        disabled={disabled}
        aria-label={`選擇行動：${actionLabel}`}
        data-panel-id={panelId}
        onClick={() => onChoose(panelId)}
      >
        {actionLabel}
      </button>
    </article>
  )
}
