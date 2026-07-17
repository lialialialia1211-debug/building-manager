export function revealDuration(input: {
  wasRead: boolean
  motion: 'standard' | 'hero'
  autoFastForward: boolean
}): number {
  if (input.wasRead && input.autoFastForward) return 280
  return input.motion === 'hero' ? 3000 : 2200
}
