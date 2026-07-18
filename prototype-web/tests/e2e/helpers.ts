import { expect, type Page } from '@playwright/test'

const PROGRESS_KEY = 'building-manager-progress-v1'

interface PlayRouteOptions {
  adultContent?: boolean
  dealSeed?: string
}

export async function playRoute(
  page: Page,
  roomName: RegExp,
  panelIds: string[],
  options: PlayRouteOptions = {},
) {
  await page.addInitScript(
    ({
      adultContent,
      dealSeed,
      progressKey,
      routePanelIds,
    }) => {
      if (dealSeed) {
        Object.defineProperty(globalThis.crypto, 'randomUUID', {
          configurable: true,
          value: () => dealSeed,
        })
      }
      const readHistory = Object.fromEntries(
        routePanelIds.map((panelId) => [
          `${panelId}::default`,
          true,
        ]),
      )

      localStorage.setItem(
        progressKey,
        JSON.stringify({
          version: 1,
          currentRun: null,
          completedEndings: {},
          clues: [],
          galleryUnlocks: [],
          crossRoomFlags: {},
          readHistory,
          settings: {
            adultContent,
            exactStats: false,
            autoFastForward: true,
          },
        }),
      )
    },
    {
      adultContent: options.adultContent ?? true,
      dealSeed: options.dealSeed ?? '',
      progressKey: PROGRESS_KEY,
      routePanelIds: panelIds,
    },
  )

  await page.goto('/')
  await page.getByRole('button', { name: roomName }).click()
  await page.getByRole(
    'button',
    { name: /^(開始|重新遊玩)$/ },
  ).click()

  // The illustrated opening plays before the cards (once art loads); skip it.
  await page.getByRole('button', { name: '跳過開場' }).click()
  await expect(page.getByTestId('comic-screen')).toBeVisible()

  for (const panelId of panelIds) {
    const candidate = page.locator(
      `[data-panel-id="${panelId}"]`,
    )

    await expect(candidate).toBeVisible()
    await expect(candidate).toHaveAccessibleName(
      /^加入編排：\S/,
    )
    await expect(candidate).not.toHaveAttribute(
      'aria-label',
      new RegExp(panelId),
    )
    await candidate.click()
  }

  if (panelIds.length > 0) {
    await page.getByRole('button', {
      name: '確認編排並揭曉',
    }).click()
    await expect(page.getByTestId('result-screen'))
      .toBeVisible()
  }
}
