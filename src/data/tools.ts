import { BookMarked, FileText, PenTool, Puzzle, ScanSearch, Search, ScrollText, Type, type LucideIcon } from 'lucide-react'

/** 8 công cụ học tập: dùng chung cho menu "Công cụ" và trang chủ. */
export const tools: { to: string; key: string; icon: LucideIcon; color: string }[] = [
  { to: '/pinyin', key: 'pinyin', icon: Type, color: 'bg-sky' },
  { to: '/radicals', key: 'radicals', icon: Puzzle, color: 'bg-sand' },
  { to: '/dictionary', key: 'dictionary', icon: Search, color: 'bg-sage' },
  { to: '/notebook', key: 'notebook', icon: BookMarked, color: 'bg-coral' },
  { to: '/grammar', key: 'grammar', icon: ScrollText, color: 'bg-apricot' },
  { to: '/analyze', key: 'analyze', icon: ScanSearch, color: 'bg-brick-soft' },
  { to: '/text', key: 'text', icon: FileText, color: 'bg-lilac' },
  { to: '/worksheet', key: 'worksheet', icon: PenTool, color: 'bg-sage' },
]
