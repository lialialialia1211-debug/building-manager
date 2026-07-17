import type {
  ProgressData,
  ProgressSettings,
} from '@/domain/progress'
import { PlaytestExport } from '@/screens/PlaytestExport'

interface SettingsScreenProps {
  progress: ProgressData
  onSettingChange<K extends keyof ProgressSettings>(
    setting: K,
    value: ProgressSettings[K],
  ): void
  onBack(): void
}

const settings: Array<{
  id: keyof ProgressSettings
  label: string
  description: string
}> = [
  {
    id: 'adultContent',
    label: '成人內容',
    description: '關閉時以安全版本呈現親密結局回想。',
  },
  {
    id: 'exactStats',
    label: '顯示精確數值',
    description: '在狀態列顯示好感、信任與親密的實際數值。',
  },
  {
    id: 'autoFastForward',
    label: '自動快轉已讀內容',
    description: '已讀過的對話與畫格使用較短揭示時間。',
  },
]

export function SettingsScreen({
  progress,
  onSettingChange,
  onBack,
}: SettingsScreenProps) {
  return (
    <section
      className="settings-screen"
      data-testid="settings-screen"
      aria-labelledby="settings-title"
    >
      <header className="utility-header">
        <div>
          <p>遊玩偏好</p>
          <h1 id="settings-title">設定</h1>
        </div>
        <button type="button" onClick={onBack}>
          返回大樓
        </button>
      </header>

      <div className="settings-list">
        {settings.map(({ id, label, description }) => (
          <label className="setting-row" key={id}>
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <input
              type="checkbox"
              aria-label={label}
              checked={progress.settings[id]}
              onChange={(event) => {
                onSettingChange(id, event.currentTarget.checked)
              }}
            />
          </label>
        ))}
      </div>

      <PlaytestExport />
    </section>
  )
}
