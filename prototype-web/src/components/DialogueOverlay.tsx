export interface DialogueOverlayProps {
  lines: readonly string[]
}

export function DialogueOverlay({ lines }: DialogueOverlayProps) {
  return (
    <div className="dialogue-overlay" aria-label="對話">
      {lines.slice(0, 2).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
