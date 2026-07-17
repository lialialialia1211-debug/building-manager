import { render, screen } from '@testing-library/react'
import { StatusStrip } from '@/components/StatusStrip'

const stats = {
  affection: 2,
  trust: 4,
  intimacy: 1,
}

test('qualitative status hides exact stat values', () => {
  render(<StatusStrip stats={stats} exact={false} />)

  expect(screen.queryByTestId('exact-stat-affection'))
    .not.toBeInTheDocument()
  expect(screen.queryByText('4')).not.toBeInTheDocument()
})

test('exact status shows every final stat value', () => {
  render(<StatusStrip stats={stats} exact />)

  expect(screen.getByTestId('exact-stat-affection')).toHaveTextContent('2')
  expect(screen.getByTestId('exact-stat-trust')).toHaveTextContent('4')
  expect(screen.getByTestId('exact-stat-intimacy')).toHaveTextContent('1')
})
