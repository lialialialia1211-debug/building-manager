import { expect, test } from 'vitest'
import { resolveRoomPresentation } from '@/domain/room-presentation'

test('uses the default Room B presentation without the inherited flag', () => {
  const presentation = resolveRoomPresentation('room_b_wall', {})

  expect(presentation.visualVariant).toBe('default')
  expect(
    presentation.dialogueVariantFor('b1_glass'),
  ).toBe('default')
})

test('uses the circuit presentation and cross-room glass dialogue', () => {
  const presentation = resolveRoomPresentation('room_b_wall', {
    a_hidden_circuit: true,
  })

  expect(presentation.visualVariant).toBe('circuit')
  expect(
    presentation.dialogueVariantFor('b1_glass'),
  ).toBe('cross_room')
  expect(
    presentation.dialogueVariantFor('b1_knock'),
  ).toBe('default')
})

test('preserves an authored variant outside the Room B glass override', () => {
  const presentation = resolveRoomPresentation('room_a_blackout', {
    a_hidden_circuit: true,
  })

  expect(presentation.visualVariant).toBe('default')
  expect(
    presentation.dialogueVariantFor('a1_door', 'authored'),
  ).toBe('authored')
})
