export interface DialogueOverlayProps {
  lines: readonly string[]
  maxLines?: number
}

export function DialogueOverlay({
  lines,
  maxLines = 2,
}: DialogueOverlayProps) {
  return (
    <div className="dialogue-overlay" aria-label="對話">
      {lines.slice(0, maxLines).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
