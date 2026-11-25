import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from '../lib/firebase'

/**
 * Lắng nghe trạng thái đăng nhập Firebase.
 * Component nên dùng useAuth() từ contexts/AuthContext thay vì gọi trực tiếp hook này.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  // Khi chưa cấu hình Firebase thì không có gì để chờ.
  const [loading, setLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
