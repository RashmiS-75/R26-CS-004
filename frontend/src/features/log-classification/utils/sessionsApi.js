// Upload History API — calls the log-classification ml-service session endpoints.

const BASE = import.meta.env.VITE_LOG_CLASSIFICATION_API_URL || 'http://127.0.0.1:8080/classify';

export const saveSession = async (session) => {
  const res = await fetch(`${BASE}/sessions/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!res.ok) throw new Error('Failed to save session');
  return await res.json();
};

export const fetchSessions = async () => {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch upload history');
  return await res.json();
};

export const fetchSession = async (id) => {
  const res = await fetch(`${BASE}/sessions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch session');
  return await res.json();
};

export const deleteSession = async (id) => {
  const res = await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete session');
  return await res.json();
};
