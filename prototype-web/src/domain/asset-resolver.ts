export interface AssetVariants {
  default?: string
  adult?: string
  safe?: string
}

function isAdultPath(path: string | undefined): boolean {
  return path?.toLowerCase().includes('/adult/') === true
}

export function resolveAsset(
  variants: AssetVariants,
  adultContent: boolean,
): string {
  if (adultContent) {
    return variants.adult ?? variants.default ?? variants.safe ?? ''
  }

  if (variants.safe && !isAdultPath(variants.safe)) {
    return variants.safe
  }
  if (variants.default && !isAdultPath(variants.default)) {
    return variants.default
  }
  return ''
}
