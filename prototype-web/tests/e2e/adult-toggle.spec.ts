import { expect, test } from '@playwright/test'
import { playRoute } from './helpers'

test('adult-off intimacy flow never requests adult assets', async ({
  page,
}) => {
  const adultRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/adult/')) {
      adultRequests.push(request.url())
    }
  })

  await playRoute(
    page,
    /停電之夜/,
    [
      'a1_door',
      'a2d_listen',
      'a3_share',
      'a4_comfort',
      'a5_ask',
      'a6_consent',
    ],
    {
      adultContent: false,
      dealSeed: '00000000-0000-4000-8000-000000000018',
    },
  )

  await expect(page.getByTestId('result-art'))
    .toHaveAttribute('data-asset-id', 'a_safe_06')
  expect(adultRequests).toEqual([])
})
