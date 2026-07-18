export type StatName = 'affection' | 'trust' | 'intimacy'
export type EndingId = 'main' | 'normal' | 'intimacy'

export interface Conditions {
  allFlags?: string[]
  noneFlags?: string[]
  minimumStats?: Partial<Record<StatName, number>>
}

export interface PanelDefinition {
  next: string
  previewAsset: string
  actionLabel: string
  artBrief?: string
  fullAsset?: string
  safeAsset?: string
  dialogue: string[]
  dialogueVariants?: Record<string, string[]>
  dialogueVariant?: string
  effects?: Partial<Record<StatName, number>>
  setFlags?: string[]
  conditions?: Conditions
  motion?: 'standard' | 'hero'
}

export interface StoryNode {
  candidates: [string, string, string]
}

export interface EndingRule {
  id: EndingId
  priority: number
  conditions: Conditions
}

export interface EndingContent {
  title: string
  asset: string
  clueIds: string[]
  galleryUnlocks: string[]
  dialogue?: string[]
  artBrief?: string
}

export interface DraftingDefinition {
  dealSize: 12
  selectionSize: 6
  requiredDealPanels?: string[]
}

export interface RoomDefinition {
  schemaVersion: 1
  id: string
  title: string
  backgroundAsset: string
  openingAssets: [string, string, string]
  startNode: string
  alternateStartNodes?: Record<string, string>
  safeNode: string
  endingAnchor: string
  nodes: Record<string, StoryNode>
  panels: Record<string, PanelDefinition>
  drafting?: DraftingDefinition
  openingDialogue?: string[]
  endingRules: EndingRule[]
  endingContent: Record<EndingId, EndingContent>
}

export interface CharacterDefinition {
  id: string
  displayName: string
  age: number
  ageStatus: 'adult'
  roomId: string
}

export interface GalleryEntry {
  id: string
  roomId: string
  endingId: EndingId
  adult: boolean
  adultSequence?: string[]
  safeSequence?: string[]
}
