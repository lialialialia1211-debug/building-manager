import { PanelMotion } from './PanelMotion'
import { RuntimeImage } from './RuntimeImage'
import {
  assetUrl,
  type AssetCatalog,
  type RuntimeAssetKind,
} from '@/domain/runtime-assets'

interface ComicPanelProps {
  testId: 'comic-opening' | 'comic-choice-slot' | 'comic-ending'
  label: string
  catalog?: AssetCatalog
  assetId?: string
  variant?: RuntimeAssetKind
  imageSrc?: string
  focused?: boolean
  revealed?: boolean
  revealDurationMs?: number
  onRevealFinished?(): void
}

function safeAssetUrl(
  catalog: AssetCatalog,
  assetId: string,
  variant: RuntimeAssetKind,
): string | null {
  try {
    return assetUrl(catalog, assetId, variant)
  } catch {
    return null
  }
}

export function ComicPanel({
  testId,
  label,
  catalog,
  assetId,
  variant = 'full',
  imageSrc,
  focused = false,
  revealed = false,
  revealDurationMs,
  onRevealFinished,
}: ComicPanelProps) {
  const modifierClass = {
    'comic-opening': 'comic-panel-opening',
    'comic-choice-slot': 'comic-panel-choice-slot',
    'comic-ending': 'comic-panel-ending',
  }[testId]

  const revealUrl =
    catalog && assetId ? safeAssetUrl(catalog, assetId, 'full') : null
  const hasImage = Boolean((catalog && assetId) || imageSrc)

  let body
  if (
    revealed
    && revealDurationMs !== undefined
    && onRevealFinished
    && revealUrl
  ) {
    body = (
      <PanelMotion
        key={revealUrl}
        layers={{ background: revealUrl }}
        durationMs={revealDurationMs}
        onFinished={onRevealFinished}
      />
    )
  } else if (catalog && assetId) {
    body = (
      <RuntimeImage
        catalog={catalog}
        assetId={assetId}
        variant={variant}
        alt={label}
      />
    )
  } else if (imageSrc) {
    body = <img src={imageSrc} alt="" draggable={false} />
  } else {
    body = <span className="empty-panel-mark" aria-hidden="true" />
  }

  return (
    <article
      className={[
        'comic-panel',
        modifierClass,
        focused ? 'comic-panel-focused' : '',
        revealed ? 'comic-panel-revealed' : '',
        hasImage ? 'comic-panel-filled' : 'comic-panel-empty',
      ].filter(Boolean).join(' ')}
      data-testid={testId}
      aria-label={label}
    >
      {body}
    </article>
  )
}
