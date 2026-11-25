# Học Tiếng Trung 汉字

Web app học tiếng Trung HSK miễn phí.

## Stack
- React + Vite + TypeScript
- Tailwind CSS v4
- Firebase (Auth + Firestore)
- Cloudflare Pages

## Setup
1. Clone repo
2. `npm install`
3. Copy `.env.local.example` → `.env.local`, điền Firebase keys
4. `npm run dev`

## Deploy
Push lên GitHub → Cloudflare Pages tự động build.
- Build command: `npm run build`
- Output: `dist`

Nhớ khai báo 6 biến `VITE_FIREBASE_*` trong phần Environment variables của Cloudflare Pages,
và thêm domain `*.pages.dev` vào Firebase Authentication → Settings → Authorized domains.
Firestore security rules nằm trong file `firestore.rules`.
