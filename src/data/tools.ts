import { features } from './features'

/** Các mục trong menu "Công cụ": lấy từ danh mục tính năng chung (data/features.ts). */
export const tools = features.map(({ to, key, icon, color }) => ({ to, key, icon, color }))
