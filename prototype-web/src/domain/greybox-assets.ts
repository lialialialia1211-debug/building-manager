const sceneMarkup = [
  [
    '<rect x="70" y="62" width="170" height="270" rx="8" fill="#151a22" stroke="#8291a8" stroke-width="8"/>',
    '<circle cx="390" cy="132" r="46" fill="#a6b2c4"/>',
    '<path d="M332 320c8-91 28-139 58-139s50 48 58 139z" fill="#77859b"/>',
    '<path d="M264 211h92" stroke="#d5bd7e" stroke-width="16" stroke-linecap="round"/>',
  ].join(''),
  [
    '<rect x="278" y="70" width="208" height="238" rx="16" fill="#151a22" stroke="#8291a8" stroke-width="8"/>',
    '<path d="M316 123h62v62h-62zm72 0h62v62h-62zm-72 72h62v62h-62zm72 0h62v62h-62z" fill="#d5bd7e" opacity=".72"/>',
    '<circle cx="142" cy="139" r="45" fill="#a6b2c4"/>',
    '<path d="M91 322c8-92 24-138 51-138s43 46 51 138z" fill="#77859b"/>',
  ].join(''),
  [
    '<circle cx="185" cy="132" r="46" fill="#a6b2c4"/>',
    '<path d="M128 321c8-92 27-139 57-139s49 47 57 139z" fill="#77859b"/>',
    '<path d="M264 206l176-58 29 112-176 58z" fill="#e5ddca" stroke="#8291a8" stroke-width="7"/>',
    '<path d="M307 222l101-33m-90 72 101-33" stroke="#7a6650" stroke-width="8" stroke-linecap="round"/>',
  ].join(''),
] as const

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function greyboxPanel(
  panelId: string,
  variant: number,
  showPanelId = false,
): string {
  const developerLabel = showPanelId
    ? `<text x="24" y="342" fill="#f8f5eb" font-size="22">${escapeXml(panelId)}</text>`
    : ''
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="360" viewBox="0 0 560 360">',
    '<rect width="560" height="360" fill="#242b38"/>',
    '<path d="M0 36h560M0 324h560" stroke="#303949" stroke-width="2"/>',
    sceneMarkup[variant % sceneMarkup.length],
    developerLabel,
    '</svg>',
  ].join('')

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function greyboxAnchor(
  label: string,
  ending = false,
): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="360" viewBox="0 0 960 360">',
    `<rect width="960" height="360" fill="${ending ? '#25232d' : '#202a32'}"/>`,
    '<path d="M70 286L245 112l118 108 142-151 180 171 101-92 104 138" fill="none" stroke="#66758a" stroke-width="18" opacity=".58"/>',
    '<circle cx="205" cy="126" r="40" fill="#9aa8bb"/>',
    '<path d="M142 300c12-94 33-141 63-141s51 47 63 141z" fill="#68788f"/>',
    `<text x="760" y="314" fill="#d7c284" font-size="28" text-anchor="middle">${escapeXml(label)}</text>`,
    '</svg>',
  ].join('')

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
