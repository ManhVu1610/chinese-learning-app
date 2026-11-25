import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import Navbar, { MobileTabBar } from './Navbar'

export default function Layout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-paper text-ink print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="pt-22 print:p-0">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pt-6 pb-28 text-center text-xs text-ink-muted md:pb-8 print:hidden">
        {t('common.credits_strokes')}{' '}
        <a href="https://github.com/skishore/makemeahanzi" target="_blank" rel="noreferrer" className="underline">
          Make Me a Hanzi
        </a>{' '}
        (<a href="/strokes/ARPHICPL.TXT" target="_blank" className="underline">Arphic Public License</a>) · {t('common.credits_fonts')}
      </footer>
      <div className="print:hidden">
        <MobileTabBar />
      </div>
    </div>
  )
}
