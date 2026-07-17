import { expect, test } from '@playwright/test'
import { playRoute } from './helpers'

const roomARoutes = {
  main: {
    heading: '藏在停電後的線索',
    dealSeed: '00000000-0000-4000-8000-000000000011',
    panels: [
      'a1_fuse',
      'a2f_tools',
      'a3_trace',
      'a4_ground',
      'a5_photo',
      'a6_report',
    ],
  },
  intimacy: {
    heading: '停電之夜的承諾',
    dealSeed: '00000000-0000-4000-8000-000000000018',
    panels: [
      'a1_door',
      'a2d_listen',
      'a3_share',
      'a4_comfort',
      'a5_ask',
      'a6_consent',
    ],
  },
  normal: {
    heading: '天亮之前',
    dealSeed: '00000000-0000-4000-8000-000000001652',
    panels: [
      'a1_note',
      'a2n_wait',
      'a3_candle',
      'a4_sleep',
      'a5_ignore',
      'a6_morning',
    ],
  },
} as const

for (const [endingId, route] of Object.entries(roomARoutes)) {
  test(`Room A reaches its ${endingId} ending`, async ({ page }) => {
    await playRoute(
      page,
      /停電之夜/,
      [...route.panels],
      { dealSeed: route.dealSeed },
    )

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: route.heading,
      }),
    ).toBeVisible()
  })
}
