
/*
 * Upload History API — calls the Audixa Main API,
 * which proxies requests to the log-classification service.
 */

import { apiFetch } from '../../../api'

export const saveSession = async (session) => {
  const res = await apiFetch('/classify/sessions/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(session),
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please log in again.')
    }

    if (res.status === 403) {
      throw new Error('You do not have permission to save sessions.')
    }

    throw new Error('Failed to save session')
  }

  return await res.json()
}

export const fetchSessions = async () => {
  const res = await apiFetch('/classify/sessions')

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please log in again.')
    }

    throw new Error('Failed to fetch upload history')
  }

  return await res.json()
}

export const fetchSession = async (id) => {
  const safeId = encodeURIComponent(id)
  const res = await apiFetch(`/classify/sessions/${safeId}`)

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please log in again.')
    }

    if (res.status === 404) {
      throw new Error('Session not found')
    }

    throw new Error('Failed to fetch session')
  }

  return await res.json()
}

export const deleteSession = async (id) => {
  const safeId = encodeURIComponent(id)
  const res = await apiFetch(`/classify/sessions/${safeId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please log in again.')
    }

    if (res.status === 403) {
      throw new Error('You do not have permission to delete sessions.')
    }

    if (res.status === 404) {
      throw new Error('Session not found')
    }

    throw new Error('Failed to delete session')
  }

  return await res.json()
}
