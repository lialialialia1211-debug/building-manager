export interface AgeGateProps {
  onConfirm(): void
}

export function AgeGate({ onConfirm }: AgeGateProps) {
  return (
    <section className="age-gate" aria-labelledby="age-gate-title">
      <p className="eyebrow">OFFICE AFTER HOURS · 18+</p>
      <h1 id="age-gate-title">成人內容確認</h1>
      <p>本遊戲包含成年人之間的露骨性內容。</p>
      <p>所有登場人物在本作中均為成年人，互動皆為自願。</p>
      <div className="age-gate__actions">
        <button type="button" className="primary-action" onClick={onConfirm}>
          我已年滿 18 歲，進入遊戲
        </button>
        <a className="secondary-action" href="about:blank">離開</a>
      </div>
    </section>
  )
}
