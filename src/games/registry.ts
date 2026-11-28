import { Bug, Crosshair, Layers3, Link2, ScanSearch, type LucideIcon } from 'lucide-react'

/** Danh sách trò chơi trong mục "Trò chơi" (/games). Thêm trò mới: thêm một dòng + route trong pages/Games.tsx. */
export interface GameInfo {
  key: GameKey
  icon: LucideIcon
  /** Màu nền biểu tượng */
  color: string
}

export type GameKey = 'word-search' | 'shooter' | 'match' | 'bugs' | 'solitaire'

export const games: GameInfo[] = [
  { key: 'word-search', icon: ScanSearch, color: 'bg-sky' },
  { key: 'shooter', icon: Crosshair, color: 'bg-coral' },
  { key: 'match', icon: Link2, color: 'bg-sage' },
  { key: 'bugs', icon: Bug, color: 'bg-apricot' },
  { key: 'solitaire', icon: Layers3, color: 'bg-lilac' },
]
