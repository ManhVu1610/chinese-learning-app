import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { migrateLocalToCloud } from '../lib/srsStore'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginWithGoogle = async () => {
    if (!auth) return
    setLoading(true)
    setError(null)
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider())
      try {
        // Đưa tiến độ ôn tập offline lên cloud; localStorage chỉ bị xóa khi upload xong.
        await migrateLocalToCloud(user.uid)
      } catch (e) {
        setError(t('auth.migrate_failed', { message: e instanceof Error ? e.message : String(e) }))
        return
      }
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-4xl font-bold text-[#DC2626]">汉字</p>
        <h1 className="mt-3 text-2xl font-bold">{t('common.login')}</h1>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={!isFirebaseConfigured || loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {loading ? t('common.loading') : t('common.login_google')}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {t('common.skip_login')}
        </button>

        {!isFirebaseConfigured && (
          <p className="mt-4 text-xs text-amber-600">{t('common.firebase_missing')}</p>
        )}
        {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      </div>
    </section>
  )
}
