import { useCallback, useEffect, useState } from 'react';
import { fetchSessions, deleteSession } from '../utils/sessionsApi';

// Manages the Upload History session list: fetch, refresh, delete.
export function useUploadHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch {
      setError('Cannot connect to ML classification backend service. Make sure backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const removeSession = useCallback(async (id) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sessions, loading, error, reload: loadSessions, removeSession };
}
