import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { PanelMotion } from '@/components/PanelMotion'

function fireAnimationEnd(
  element: Element,
  animationName: string,
): void {
  const event = new Event('webkitAnimationEnd', {
    bubbles: true,
  })
  Object.defineProperty(event, 'animationName', {
    value: animationName,
  })
  fireEvent(element, event)
}

test('renders layered assets on one reveal timeline', () => {
  render(
    <PanelMotion
      layers={{
        background: 'background.png',
        characterA: 'character-a.png',
        characterB: 'character-b.png',
        effects: 'effects.png',
      }}
      durationMs={2200}
      onFinished={() => undefined}
    />,
  )

  expect(screen.getByTestId('panel-motion')).toHaveStyle({
    '--reveal-duration': '2200ms',
  })
  expect(screen.getAllByRole('presentation')).toHaveLength(4)
})

test('finishes once only when the outer panel-settle animation completes', () => {
  const onFinished = vi.fn()
  render(
    <PanelMotion
      layers={{
        background: 'background.png',
        characterA: 'character-a.png',
      }}
      durationMs={2200}
      onFinished={onFinished}
    />,
  )
  const motion = screen.getByTestId('panel-motion')
  const childLayer = screen.getAllByRole('presentation')[1]!

  fireAnimationEnd(childLayer, 'character-rise')
  fireAnimationEnd(childLayer, 'panel-settle')
  expect(onFinished).not.toHaveBeenCalled()

  fireAnimationEnd(motion, 'panel-settle')
  fireAnimationEnd(motion, 'panel-settle')

  expect(onFinished).toHaveBeenCalledTimes(1)
})
