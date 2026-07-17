export type RoomVisualVariant = 'default' | 'circuit'

export interface RoomPresentation {
  visualVariant: RoomVisualVariant
  dialogueVariantFor(
    panelId: string | undefined,
    authoredVariant?: string,
  ): string
}

export function resolveRoomPresentation(
  roomId: string,
  crossRoomFlags: Record<string, boolean>,
): RoomPresentation {
  const circuitEnabled = (
    roomId === 'room_b_wall'
    && crossRoomFlags.a_hidden_circuit === true
  )

  return {
    visualVariant: circuitEnabled ? 'circuit' : 'default',
    dialogueVariantFor(panelId, authoredVariant = 'default') {
      return circuitEnabled && panelId === 'b1_glass'
        ? 'cross_room'
        : authoredVariant
    },
  }
}
