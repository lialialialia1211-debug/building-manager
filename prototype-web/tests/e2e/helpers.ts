import { expect, type Page } from '@playwright/test'

const PROGRESS_KEY = 'building-manager-progress-v1'

interface PlayRouteOptions {
  adultContent?: boolean
  dealSeed?: string
  requireOpening?: boolean
  onBuilding?(page: Page): Promise<void>
  onOpening?(page: Page): Promise<void>
  onComic?(page: Page): Promise<void>
  onResult?(page: Page): Promise<void>
}

export interface PageFailureRecorder {
  assertNoFailures(): Promise<void>
}

export function recordPageFailures(page: Page): PageFailureRecorder {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const failedRequests: string[] = []

  page.on('pageerror', (error) => {
    pageErrors.push(error.stack ?? error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('requestfailed', (request) => {
    failedRequests.push([
      request.method(),
      request.url(),
      request.failure()?.errorText ?? 'unknown failure',
    ].join(' '))
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedRequests.push([
        response.request().method(),
        response.url(),
        response.status(),
      ].join(' '))
    }
  })

  return {
    async assertNoFailures() {
      await page.waitForLoadState('networkidle')
      expect(pageErrors, 'unexpected page errors').toEqual([])
      expect(consoleErrors, 'unexpected console errors').toEqual([])
      expect(failedRequests, 'unexpected failed requests').toEqual([])
    },
  }
}

export async function playRoute(
  page: Page,
  roomName: RegExp,
  panelIds: string[],
  options: PlayRouteOptions = {},
) {
  const failures = recordPageFailures(page)
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
      adultContent: options.adultContent ?? false,
      dealSeed: options.dealSeed ?? '',
      progressKey: PROGRESS_KEY,
      routePanelIds: panelIds,
    },
  )

  await page.goto('/')
  await options.onBuilding?.(page)
  await page.getByRole('button', { name: roomName }).click()
  await page.getByRole(
    'button',
    { name: /^(開始|重新遊玩)$/ },
  ).click()
  const skipOpening = page.getByRole('button', {
    name: '跳過開場',
  })
  const comicScreen = page.getByTestId('comic-screen')
  if (options.requireOpening) {
    await expect(skipOpening).toBeVisible()
  } else {
    await expect(skipOpening.or(comicScreen)).toBeVisible()
  }
  if (await skipOpening.isVisible()) {
    await options.onOpening?.(page)
    await skipOpening.click()
  }
  await expect(comicScreen).toBeVisible()
  await options.onComic?.(page)

  for (const panelId of panelIds) {
    const candidate = page.locator(
      `[data-panel-id="${panelId}"]`,
    ).getByRole('button')

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
    const resultScreen = page.getByTestId('result-screen')
    await expect(resultScreen).toBeVisible()
    await expect(resultScreen.getByRole('heading', { level: 1 }))
      .toBeVisible()
    await expect(resultScreen.locator('.cinematic-player'))
      .toBeVisible()
    await expect(resultScreen.getByTestId('cinematic-stage'))
      .toBeVisible()
    await options.onResult?.(page)
  }

  await failures.assertNoFailures()
  return failures
}
