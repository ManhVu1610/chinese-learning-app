import { useTranslation } from 'react-i18next'

export default function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
      <p className="mt-3 text-lg text-slate-500">{t('common.coming_soon')}</p>
    </section>
  )
}
