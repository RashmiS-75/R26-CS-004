
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

export function getStoredSession() {
  try {
    const raw = localStorage.getItem('audixa-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function apiFetch(path, options = {}) {
  const session = getStoredSession()
  const headers = new Headers(options.headers || {})

  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && path !== '/login') {
    localStorage.removeItem('audixa-user')
    window.dispatchEvent(new Event('audixa:unauthorized'))
  }

  return response
}
