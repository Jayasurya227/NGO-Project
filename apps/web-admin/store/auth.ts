import { create } from 'zustand'
import { AuthSession, saveSession, clearSession, getSession } from '../lib/auth'

interface AuthStore {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  logout: () => void
  init: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  setSession: (session) => {
    saveSession(session)
    set({ session })
  },
  logout: () => {
    clearSession()
    set({ session: null })
  },
  init: () => {
    const session = getSession()
    set({ session })
  },
}))