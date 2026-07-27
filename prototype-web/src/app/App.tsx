import { useEffect } from 'react'
import { useStore } from 'zustand'
import {
  comicStore,
  type ComicStore,
} from './store'

export interface AppProps {
  store?: ComicStore
}

export function App({ store = comicStore }: AppProps) {
  const screen = useStore(store, (state) => state.screen)
  const episode = useStore(store, (state) => state.episode)
  const errorMessage = useStore(store, (state) => state.errorMessage)
  const initialize = useStore(store, (state) => state.initialize)
  const confirmAge = useStore(store, (state) => state.confirmAge)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (screen === 'loading') {
    return (
      <main className="app-shell" aria-busy="true">
        <p role="status">正在載入劇本…</p>
      </main>
    )
  }

  if (screen === 'error') {
    return (
      <main className="app-shell">
        <section role="alert">
          <h1>劇本載入失敗</h1>
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void initialize()}>
            重新載入
          </button>
        </section>
      </main>
    )
  }

  if (screen === 'age-gate') {
    return (
      <main className="app-shell">
        <section aria-labelledby="age-gate-title">
          <h1 id="age-gate-title">成人內容確認</h1>
          <p>本遊戲包含成年人之間的露骨性內容。</p>
          <p>所有登場人物在本作中均為成年人，互動皆為自願。</p>
          <button type="button" onClick={confirmAge}>
            我已年滿 18 歲，進入遊戲
          </button>
          <a href="about:blank">離開</a>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <h1>{episode?.title ?? '鎖門之後'}</h1>
      <p>辦公室漫畫編排器</p>
    </main>
  )
}
