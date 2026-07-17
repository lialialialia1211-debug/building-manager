interface CandidateCardProps {
  panelId: string
  actionLabel: string
  previewSrc: string
  disabled: boolean
  onChoose(panelId: string): void
}

export function CandidateCard({
  panelId,
  actionLabel,
  previewSrc,
  disabled,
  onChoose,
}: CandidateCardProps) {
  return (
    <button
      className="candidate-card"
      type="button"
      disabled={disabled}
      aria-label={`選擇行動：${actionLabel}`}
      data-panel-id={panelId}
      onClick={() => onChoose(panelId)}
    >
      <img src={previewSrc} alt="" draggable={false} />
    </button>
  )
}
