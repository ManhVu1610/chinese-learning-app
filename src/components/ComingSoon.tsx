import { Hourglass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Page from './layout/Page'

/** Trang đang phát triển, vẫn nằm trong khung trang chung để không lạc khỏi mạch học. */
export default function ComingSoon({ feature }: { feature: string }) {
  const { t } = useTranslation()
  return (
    <Page feature={feature} size="narrow">
      <div className="box p-10 text-center">
        <span className="sticker bg-sand p-3">
          <Hourglass size={28} />
        </span>
        <p className="mt-5 text-lg font-bold">{t('common.coming_soon')}</p>
      </div>
    </Page>
  )
}
