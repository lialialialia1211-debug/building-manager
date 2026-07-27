import { expect, type Page } from '@playwright/test'

export async function enterGame(page: Page) {
  await page.goto('/')
  const ageHeading = page.getByRole('heading', { name: '成人內容確認' })
  const builderHeading = page.getByRole('heading', { name: '鎖門之後' })
  await expect(ageHeading.or(builderHeading)).toBeVisible()

  const ageButton = page.getByRole('button', {
    name: '我已年滿 18 歲，進入遊戲',
  })
  if (await ageButton.isVisible()) await ageButton.click()
  await expect(builderHeading).toBeVisible()
}

export async function addCards(
  page: Page,
  cards: {
    characters?: string[]
    scenes?: string[]
    props?: string[]
  },
) {
  if (cards.characters) {
    await page.getByRole('tab', { name: '人物 5' }).click()
    for (const title of cards.characters) {
      await page.getByRole('button', { name: `加入${title}` }).click()
    }
  }
  if (cards.scenes) {
    await page.getByRole('tab', { name: '場景 4' }).click()
    for (const title of cards.scenes) {
      await page.getByRole('button', { name: `加入${title}` }).click()
    }
  }
  if (cards.props) {
    await page.getByRole('tab', { name: '道具 4' }).click()
    for (const title of cards.props) {
      await page.getByRole('button', { name: `加入${title}` }).click()
    }
  }
}

export async function fillPerfectRoute(page: Page) {
  await addCards(page, {
    characters: ['男漂泊者', '長離'],
    scenes: ['主管樓層走廊', '老闆私人辦公室'],
    props: ['萬用門卡', '併購合約', '百葉窗遙控器', '威士忌酒具'],
  })
}

export async function revealEnding(page: Page) {
  await page.getByRole('button', { name: '演下去' }).click()
  for (let panel = 2; panel <= 5; panel += 1) {
    await page.getByRole('button', { name: `揭露第 ${panel} 格` }).click()
  }
  await page.getByRole('button', { name: '閱讀結局' }).click()
}

export async function resetSave(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('office-comic-builder:v1')
  })
  await page.reload()
}
