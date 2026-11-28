import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import vi from '../locales/vi.json'
import gamesEn from '../locales/games.en.json'
import gamesVi from '../locales/games.vi.json'
import examEn from '../locales/exam.en.json'
import examVi from '../locales/exam.vi.json'

const savedLang = localStorage.getItem('lang')

i18n.use(initReactI18next).init({
  resources: {
    // Chữ của mục Trò chơi (khoá game.*) và Kiểm tra (khoá exam.*) để ở tệp riêng.
    vi: { translation: { ...vi, game: gamesVi, exam: examVi } },
    en: { translation: { ...en, game: gamesEn, exam: examEn } },
  },
  lng: savedLang === 'en' ? 'en' : 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => localStorage.setItem('lang', lng))

export default i18n
