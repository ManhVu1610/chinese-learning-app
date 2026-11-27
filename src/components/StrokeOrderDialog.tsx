import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import StrokePractice from './StrokePractice'

/** Hộp thoại xem thứ tự nét bút của một từ hoặc bộ thủ. */
export default function StrokeOrderDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Modal title={t('stroke.title', { text })} onClose={onClose}>
      <StrokePractice text={text} />
    </Modal>
  )
}
