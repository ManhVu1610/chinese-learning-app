import type { User } from 'firebase/auth'
import { signOut } from 'firebase/auth'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useAuth as useFirebaseAuth } from '../hooks/useAuth'
import { auth } from '../lib/firebase'
import { clearLocalCards } from '../lib/srsStore'

interface AuthContextValue {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useFirebaseAuth()

  const logout = useCallback(async () => {
    if (auth) await signOut(auth)
    clearLocalCards()
  }, [])

  const value = useMemo(() => ({ user, loading, logout }), [user, loading, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() phải được dùng bên trong <AuthProvider>')
  return ctx
}
