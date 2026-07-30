import { fireEvent, render, screen } from '@testing-library/react'
import { AssetImage } from '@/components/AssetImage'

describe('AssetImage', () => {
  it('does not start a native image drag that would steal parent card drag events', () => {
    render(
      <AssetImage
        artId="card_char_male_rover"
        alt="男漂泊者卡面"
      />,
    )

    expect(screen.getByRole('img', { name: '男漂泊者卡面' }))
      .toHaveAttribute('draggable', 'false')
  })

  it('shows a stable labeled placeholder when planned art is missing', () => {
    render(
      <AssetImage
        artId="card_char_male_rover"
        alt="男漂泊者卡面"
        aspectRatio="4 / 5"
      />,
    )

    fireEvent.error(screen.getByRole('img', { name: '男漂泊者卡面' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('美術製作中')).toBeInTheDocument()
    expect(screen.getByText('card_char_male_rover')).toBeInTheDocument()
    expect(screen.getByTestId('asset-placeholder')).toHaveStyle({
      aspectRatio: '4 / 5',
    })
  })
})
