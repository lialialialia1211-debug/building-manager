const clueLabels: Record<string, string> = {
  a_checked_fuse: '已檢查配電箱',
  a_found_note: '發現神祕留言',
  a_hidden_circuit: '圖紙外的隱藏迴路',
  a_symbol_seen: '發現神祕符號',
  a_note_saved: '保存神祕留言',
  a_symbol_traced: '描下神祕符號',
  a_evidence: '停電異常證據',
  a_reported: '已回報停電異常',
  a_consent: '相互同意的承諾',
  b_sound_located: '定位牆後聲音',
  b_wall_mark: '牆面異常痕跡',
  b_sound_recorded: '牆後聲音錄音',
  b_reply: '牆後的回應',
  b_blueprint_gap: '圖紙缺失空間',
  b_hidden_space: '牆後的隱藏空間',
  b_evidence: '牆後異常證據',
  b_opened_space: '已開啟隱藏空間',
  b_consent: '相互同意的約定',
}

export function clueLabel(clueId: string): string {
  return clueLabels[clueId] ?? '未知線索'
}
