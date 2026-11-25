import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'
import Flashcard from './pages/Flashcard'
import Home from './pages/Home'
import Login from './pages/Login'
import Test from './pages/Test'
import Vocabulary from './pages/Vocabulary'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="vocabulary" element={<Vocabulary />} />
            <Route path="flashcard" element={<Flashcard />} />
            <Route path="test" element={<Test />} />
            <Route path="login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
