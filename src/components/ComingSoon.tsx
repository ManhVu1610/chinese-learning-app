import { Hourglass } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <div className="box p-10 text-center">
        <span className="sticker bg-sand p-3">
          <Hourglass size={28} />
        </span>
        <h1 className="mt-5 text-3xl font-bold">{t(titleKey)}</h1>
        <p className="mt-2 text-lg text-ink-soft">{t('common.coming_soon')}</p>
      </div>
    </section>
  )
}
