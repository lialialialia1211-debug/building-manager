import {
  defaultPlaytestRecorder,
  type PlaytestExporter,
} from '@/analytics/playtest-log'

interface PlaytestExportProps {
  exporter?: PlaytestExporter
}

export function PlaytestExport({
  exporter = defaultPlaytestRecorder,
}: PlaytestExportProps) {
  function download(): void {
    const objectUrl = URL.createObjectURL(exporter.exportBlob())
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'building-manager-playtest-v1.json'
    try {
      document.body.append(link)
      link.click()
    } finally {
      link.remove()
      URL.revokeObjectURL(objectUrl)
    }
  }

  return (
    <section
      className="playtest-export"
      aria-labelledby="playtest-export-title"
    >
      <div>
        <h2 id="playtest-export-title">玩家測試紀錄</h2>
        <p>
          紀錄只保存在這台裝置，按下按鈕後才會下載 JSON。
        </p>
      </div>
      <button type="button" onClick={download}>
        匯出玩家測試 JSON
      </button>
    </section>
  )
}
