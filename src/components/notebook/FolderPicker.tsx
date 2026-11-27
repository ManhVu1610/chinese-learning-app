import { useTranslation } from 'react-i18next'
import { UNCATEGORIZED } from '../../hooks/useNotebook'
import type { NotebookFolder } from '../../types'

export const NEW_FOLDER = '__new__'

/**
 * Chọn thư mục: "Chưa phân loại" (mặc định), một thư mục có sẵn, hoặc "+ Tạo thư mục mới…"
 * (khi đó hiện thêm ô nhập tên thư mục).
 */
export default function FolderPicker({
  folders,
  value,
  onChange,
  newName,
  onNewNameChange,
}: {
  folders: NotebookFolder[]
  value: string
  onChange: (v: string) => void
  newName: string
  onNewNameChange: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <label className="mt-4 block text-sm font-semibold" htmlFor="folder-picker">
        {t('notebook.folder_optional')}
      </label>
      <select
        id="folder-picker"
        value={value === UNCATEGORIZED ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1.5"
      >
        <option value="">{t('notebook.no_folder_option')}</option>
        {folders
          .filter((f) => f.id !== UNCATEGORIZED)
          .map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        <option value={NEW_FOLDER}>{t('notebook.new_folder_option')}</option>
      </select>
      {value === NEW_FOLDER && (
        <input
          autoFocus
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          placeholder={t('notebook.folder_name_placeholder')}
          aria-label={t('notebook.folder_name_placeholder')}
          className="field mt-3"
        />
      )}
    </>
  )
}

/** Trả về id thư mục cuối cùng (tạo mới nếu cần), hoặc null. */
export function resolveFolder(value: string, newName: string, createFolder: (name: string) => string): string | null {
  if (value === NEW_FOLDER) return createFolder(newName)
  return value || null
}
