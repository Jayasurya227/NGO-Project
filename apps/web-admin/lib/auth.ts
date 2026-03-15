import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type AuthSession = {
  accessToken: string
  tenantId:    string
  userId:      string
  role:        string
  email:       string
}

export function getSession(): AuthSession | null {
  const raw = Cookies.get('session')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession) {
  Cookies.set('session', JSON.stringify(session), { expires: 7 })
}

export function clearSession() {
  Cookies.remove('session')
}

export async function loginRequest(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}