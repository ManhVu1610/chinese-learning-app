import {
  BookMarked,
  Brush,
  BookOpen,
  ClipboardCheck,
  AudioLines,
  BookHeart,
  FileText,
  Gamepad2,
  NotebookPen,
  Headphones,
  Keyboard,
  Mic,
  Layers,
  PenTool,
  Puzzle,
  ScanSearch,
  Shuffle,
  ScrollText,
  Search,
  Type,
  type LucideIcon,
} from 'lucide-react'

/**
 * Danh mục mọi tính năng của app, dùng chung cho trang chủ và menu "Công cụ".
 * Thêm tính năng mới: thêm một dòng ở đây (kèm route trong App.tsx và nhãn trong locales),
 * trang chủ và menu sẽ tự hiện.
 */
export type FeatureGroup = 'learn' | 'personal' | 'drill' | 'challenge' | 'fun' | 'lookup' | 'practice'

export interface Feature {
  key: string
  to: string
  icon: LucideIcon
  /** Màu nền biểu tượng (token Tailwind) */
  color: string
  group: FeatureGroup
  /** Khoá i18n tên tính năng */
  label: string
  /** Khoá i18n mô tả ngắn trên trang chủ */
  desc: string
  /** Đang phát triển: hiện nhãn "Sắp có" */
  soon?: boolean
}

export const featureGroups: FeatureGroup[] = ['learn', 'personal', 'drill', 'challenge', 'fun', 'lookup', 'practice']

export const features: Feature[] = [
  // Học
  { key: 'vocab', to: '/vocabulary', icon: BookOpen, color: 'bg-sand', group: 'learn', label: 'nav.vocabulary', desc: 'home.desc.vocab' },
  {
    key: 'flashcard',
    to: '/flashcard',
    icon: Layers,
    color: 'bg-sage',
    group: 'learn',
    label: 'nav.flashcard',
    desc: 'home.desc.flashcard',
  },
  {
    key: 'grammar',
    to: '/grammar',
    icon: ScrollText,
    color: 'bg-apricot',
    group: 'learn',
    label: 'tools.grammar',
    desc: 'home.desc.grammar',
  },
  {
    key: 'notebook',
    to: '/notebook',
    icon: BookMarked,
    color: 'bg-coral',
    group: 'personal',
    label: 'tools.notebook',
    desc: 'home.desc.notebook',
  },
  { key: 'notes', to: '/notes', icon: NotebookPen, color: 'bg-apricot', group: 'personal', label: 'tools.notes', desc: 'home.desc.notes' },
  { key: 'radicals', to: '/radicals', icon: Puzzle, color: 'bg-sand', group: 'learn', label: 'tools.radicals', desc: 'home.desc.radicals' },
  {
    key: 'pinyin',
    to: '/pinyin',
    icon: Type,
    color: 'bg-sky',
    group: 'learn',
    label: 'tools.pinyin',
    desc: 'home.desc.pinyin',
    soon: true,
  },
  // Luyện tập
  {
    key: 'listening',
    to: '/listening',
    icon: Headphones,
    color: 'bg-sky',
    group: 'drill',
    label: 'practice.listening',
    desc: 'home.desc.listening',
  },
  {
    key: 'speaking',
    to: '/speaking',
    icon: Mic,
    color: 'bg-coral',
    group: 'drill',
    label: 'practice.speaking',
    desc: 'home.desc.speaking',
  },
  { key: 'typing', to: '/typing', icon: Keyboard, color: 'bg-lilac', group: 'drill', label: 'practice.typing', desc: 'home.desc.typing' },
  {
    key: 'mixed',
    to: '/mixed',
    icon: Shuffle,
    color: 'bg-apricot',
    group: 'drill',
    label: 'practice.mixed',
    desc: 'home.desc.mixed',
  },
  {
    key: 'shadowing',
    to: '/shadowing',
    icon: AudioLines,
    color: 'bg-sage',
    group: 'challenge',
    label: 'tools.shadowing',
    desc: 'home.desc.shadowing',
  },
  {
    key: 'games',
    to: '/games',
    icon: Gamepad2,
    color: 'bg-sand',
    group: 'fun',
    label: 'tools.games',
    desc: 'home.desc.games',
  },
  {
    key: 'stories',
    to: '/stories',
    icon: BookHeart,
    color: 'bg-brick-soft',
    group: 'fun',
    label: 'tools.stories',
    desc: 'home.desc.stories',
    soon: true,
  },
  {
    key: 'test',
    to: '/test',
    icon: ClipboardCheck,
    color: 'bg-coral',
    group: 'challenge',
    label: 'nav.test',
    desc: 'home.desc.test',
  },
  // Tra cứu
  {
    key: 'dictionary',
    to: '/dictionary',
    icon: Search,
    color: 'bg-sage',
    group: 'lookup',
    label: 'tools.dictionary',
    desc: 'home.desc.dictionary',
  },
  {
    key: 'analyze',
    to: '/analyze',
    icon: ScanSearch,
    color: 'bg-brick-soft',
    group: 'lookup',
    label: 'tools.analyze',
    desc: 'home.desc.analyze',
  },
  { key: 'text', to: '/text', icon: FileText, color: 'bg-lilac', group: 'lookup', label: 'tools.text', desc: 'home.desc.text' },
  // Luyện viết
  {
    key: 'worksheet',
    to: '/worksheet',
    icon: PenTool,
    color: 'bg-sage',
    group: 'practice',
    label: 'tools.worksheet',
    desc: 'home.desc.worksheet',
  },
  { key: 'strokes', to: '/strokes', icon: Brush, color: 'bg-coral', group: 'practice', label: 'tools.strokes', desc: 'home.desc.strokes' },
]

export const featureByKey = (key: string) => features.find((f) => f.key === key)
