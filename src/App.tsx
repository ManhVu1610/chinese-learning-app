import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import Flashcard from './pages/Flashcard'
import Home from './pages/Home'
import Login from './pages/Login'
import Test from './pages/Test'
import Vocabulary from './pages/Vocabulary'

// Các trang công cụ có dữ liệu lớn: chỉ tải khi mở.
// Bảng Pinyin tạm ẩn (sắp có), mã và dữ liệu giữ nguyên: pages/Pinyin.tsx
// const Pinyin = lazy(() => import('./pages/Pinyin'))
const Radicals = lazy(() => import('./pages/Radicals'))
const Dictionary = lazy(() => import('./pages/Dictionary'))
const Notebook = lazy(() => import('./pages/Notebook'))
const NotebookSet = lazy(() => import('./pages/NotebookSet'))
const Worksheet = lazy(() => import('./pages/Worksheet'))
const Grammar = lazy(() => import('./pages/Grammar'))
const Analyze = lazy(() => import('./pages/Analyze'))
const TextTool = lazy(() => import('./pages/TextTool'))
const Listening = lazy(() => import('./pages/Listening'))
const Speaking = lazy(() => import('./pages/Speaking'))
const Typing = lazy(() => import('./pages/Typing'))
const Mixed = lazy(() => import('./pages/Mixed'))
const Shadowing = lazy(() => import('./pages/Shadowing'))
const ShadowingLesson = lazy(() => import('./pages/ShadowingLesson'))
const Notes = lazy(() => import('./pages/Notes'))
const StrokeOrder = lazy(() => import('./pages/StrokeOrder'))
const Games = lazy(() => import('./pages/Games'))
const Stories = lazy(() => import('./pages/Stories'))
const StoryReader = lazy(() => import('./pages/StoryReader'))
const ComingSoon = lazy(() => import('./components/ComingSoon'))

function PageLoading() {
  const { t } = useTranslation()
  return <p className="box mx-auto mt-10 max-w-sm p-6 text-center text-ink-soft">{t('common.loading')}</p>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="vocabulary" element={<Vocabulary />} />
              <Route path="flashcard" element={<Flashcard />} />
              <Route path="test/*" element={<Test />} />
              <Route path="login" element={<Login />} />
              <Route path="pinyin" element={<ComingSoon feature="pinyin" />} />
              <Route path="radicals" element={<Radicals />} />
              <Route path="dictionary" element={<Dictionary />} />
              <Route path="notebook" element={<Notebook />} />
              <Route path="notebook/:id" element={<NotebookSet />} />
              <Route path="worksheet" element={<Worksheet />} />
              <Route path="worksheet/:template" element={<Worksheet />} />
              <Route path="grammar" element={<Grammar />} />
              <Route path="analyze" element={<Analyze />} />
              <Route path="text" element={<TextTool />} />
              <Route path="listening" element={<Listening />} />
              <Route path="speaking" element={<Speaking />} />
              <Route path="typing" element={<Typing />} />
              <Route path="mixed" element={<Mixed />} />
              <Route path="notes" element={<Notes />} />
              <Route path="strokes" element={<StrokeOrder />} />
              <Route path="games" element={<Games />} />
              <Route path="games/:game" element={<Games />} />
              <Route path="stories" element={<Stories />} />
              <Route path="stories/:id" element={<StoryReader />} />
              <Route path="shadowing" element={<Shadowing />} />
              <Route path="shadowing/:id" element={<ShadowingLesson />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
