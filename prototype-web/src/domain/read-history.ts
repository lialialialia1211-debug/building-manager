export function readKey(
  panelId: string,
  dialogueVariant = 'default',
): string {
  return `${panelId}::${dialogueVariant}`
}

export function markRead(
  history: Record<string, true>,
  panelId: string,
  variant?: string,
): Record<string, true> {
  return { ...history, [readKey(panelId, variant)]: true }
}

export function wasRead(
  history: Record<string, true>,
  panelId: string,
  variant?: string,
): boolean {
  return history[readKey(panelId, variant)] === true
}
