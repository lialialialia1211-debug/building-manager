import { useEffect } from 'react'
import { useStore } from 'zustand'
import {
  comicStore,
  type ComicStore,
} from './store'
import { AgeGate } from '@/components/AgeGate'
import { ComicBuilderScreen } from '@/components/ComicBuilderScreen'
import { EndingReader } from '@/components/EndingReader'
import { RevealSequence } from '@/components/RevealSequence'

export interface AppProps {
  store?: ComicStore
}

export function App({ store = comicStore }: AppProps) {
  const screen = useStore(store, (state) => state.screen)
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
        <AgeGate onConfirm={confirmAge} />
      </main>
    )
  }

  if (screen === 'reveal') {
    return (
      <main className="app-shell">
        <RevealSequence store={store} />
      </main>
    )
  }

  if (screen === 'ending') {
    return (
      <main className="app-shell">
        <EndingReader store={store} />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <ComicBuilderScreen store={store} />
    </main>
  )
}
