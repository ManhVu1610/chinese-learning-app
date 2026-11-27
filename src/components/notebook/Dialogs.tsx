import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NotebookFolder } from '../../types'
import Modal, { ModalActions } from '../Modal'
import { UNCATEGORIZED } from '../../hooks/useNotebook'
import FolderPicker, { NEW_FOLDER, resolveFolder } from './FolderPicker'

/** Tạo bộ từ vựng mới: tên + thư mục (tuỳ chọn, có thể tạo thư mục mới ngay tại đây). */
export function CreateSetDialog({
  folders,
  defaultFolderId,
  createFolder,
  onCreate,
  onClose,
}: {
  folders: NotebookFolder[]
  defaultFolderId?: string | null
  createFolder: (name: string) => string
  onCreate: (name: string, folderId: string | null) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [folder, setFolder] = useState(defaultFolderId ?? '')
  const [newFolder, setNewFolder] = useState('')
  const valid = name.trim() && (folder !== NEW_FOLDER || newFolder.trim())

  return (
    <Modal title={t('notebook.create_title')} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onCreate(name, resolveFolder(folder, newFolder, createFolder))
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('notebook.set_name_placeholder')}
          aria-label={t('notebook.set_name_placeholder')}
          maxLength={80}
          className="field"
        />
        <FolderPicker folders={folders} value={folder} onChange={setFolder} newName={newFolder} onNewNameChange={setNewFolder} />
        <ModalActions onCancel={onClose} confirmLabel={t('notebook.create')} disabled={!valid} />
      </form>
    </Modal>
  )
}

/** Đổi tên (dùng cho cả bộ và thư mục). */
export function RenameDialog({
  title,
  initial,
  onSave,
  onClose,
  extra,
}: {
  title: string
  initial: string
  onSave: (name: string) => void
  onClose: () => void
  extra?: React.ReactNode
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial)
  const valid = name.trim() && name.trim() !== initial

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(name)
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          maxLength={80}
          aria-label={title}
          className="field"
        />
        {extra}
        <ModalActions onCancel={onClose} confirmLabel={t('common.save')} disabled={!valid} />
      </form>
    </Modal>
  )
}

/** Chuyển bộ sang thư mục khác. */
export function MoveDialog({
  folders,
  current,
  createFolder,
  onMove,
  onClose,
}: {
  folders: NotebookFolder[]
  current: string | null
  createFolder: (name: string) => string
  onMove: (folderId: string | null) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  // "Chưa phân loại" tương ứng lựa chọn mặc định (giá trị rỗng).
  const currentValue = !current || current === UNCATEGORIZED ? '' : current
  const [folder, setFolder] = useState(currentValue)
  const [newFolder, setNewFolder] = useState('')
  const valid = folder === NEW_FOLDER ? newFolder.trim() : folder !== currentValue

  return (
    <Modal title={t('notebook.move_title')} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onMove(resolveFolder(folder, newFolder, createFolder))
        }}
      >
        <FolderPicker folders={folders} value={folder} onChange={setFolder} newName={newFolder} onNewNameChange={setNewFolder} />
        <ModalActions onCancel={onClose} confirmLabel={t('notebook.move')} disabled={!valid} />
      </form>
    </Modal>
  )
}

/** Xác nhận xoá. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm()
        }}
      >
        <p className="text-ink-soft">{message}</p>
        <ModalActions onCancel={onClose} confirmLabel={confirmLabel} danger />
      </form>
    </Modal>
  )
}
