import { getSession } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession()
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`
  }

  const url = `${API_URL}${path}`;
  const res = await fetch(url, { ...options, headers })
  console.log(`[API] ${path} yielded status ${res.status}`)
  
  if (!res.ok) {
     const errBody = await res.json().catch(() => ({}));
     console.error(`[API] ${path} error:`, errBody);
     return { success: false, error: errBody } as any;
  }

  const json = await res.json()
  console.log(`[API] ${path} JSON:`, json)
  return json

}


export const api = {
  get:    (path: string) => apiFetch(path),
  post:   (path: string, body: unknown) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch:  (path: string, body: unknown) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
}