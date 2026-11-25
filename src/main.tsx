import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import './lib/i18n'
import App from './App.tsx'

// Tính năng key API đã bỏ: xoá key cũ còn sót trong trình duyệt (nếu có).
localStorage.removeItem('ai_api_keys_v1')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
