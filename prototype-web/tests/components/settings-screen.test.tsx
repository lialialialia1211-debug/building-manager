import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createAppStore,
  type AppStoreApi,
} from '@/app/store'
import {
  PROGRESS_KEY,
  type StorageAdapter,
} from '@/domain/progress'
import { SettingsScreen } from '@/screens/SettingsScreen'

function createStorage(): StorageAdapter {
  const values = new Map<string, string>()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}

function renderSettings(store: AppStoreApi) {
  const state = store.getState()
  return render(
    <SettingsScreen
      progress={state.progress}
      onSettingChange={(setting, value) => {
        store.getState().updateSetting(setting, value)
      }}
      onBack={() => {}}
    />,
  )
}

test('each setting change is saved immediately', async () => {
  const user = userEvent.setup()
  const storage = createStorage()
  const store = createAppStore({ storage })
  renderSettings(store)

  await user.click(screen.getByRole('checkbox', { name: '成人內容' }))
  expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}').settings)
    .toMatchObject({ adultContent: false })

  await user.click(screen.getByRole('checkbox', { name: '顯示精確數值' }))
  expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}').settings)
    .toMatchObject({ exactStats: true })

  await user.click(screen.getByRole('checkbox', { name: '自動快轉已讀內容' }))
  expect(JSON.parse(storage.getItem(PROGRESS_KEY) ?? '{}').settings)
    .toMatchObject({ autoFastForward: false })
})

test('disabling adult content does not remove intimacy completion', async () => {
  const user = userEvent.setup()
  const storage = createStorage()
  const store = createAppStore({ storage })
  store.setState((state) => ({
    progress: {
      ...state.progress,
      completedEndings: {
        room_a_blackout: ['intimacy'],
      },
    },
  }))
  renderSettings(store)

  await user.click(screen.getByRole('checkbox', { name: '成人內容' }))

  expect(store.getState().progress.completedEndings).toEqual({
    room_a_blackout: ['intimacy'],
  })
  expect(JSON.parse(
    storage.getItem(PROGRESS_KEY) ?? '{}',
  ).completedEndings).toEqual({
    room_a_blackout: ['intimacy'],
  })
})

test('offers an explicit local playtest JSON export', () => {
  const store = createAppStore({ storage: createStorage() })

  renderSettings(store)

  expect(screen.getByRole('button', {
    name: '匯出玩家測試 JSON',
  })).toBeInTheDocument()
})
