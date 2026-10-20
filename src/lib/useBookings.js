import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookings } from './api';

/** The signed-in person's booking requests: received (as host) and sent. */
export function useBookings(enabled) {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [h, r] = await Promise.all([Bookings.list({ role: 'host', take: 50 }), Bookings.list({ role: 'requester', take: 50 })]);
      setReceived(h.items || []);
      setSent(r.items || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);
  const pending = useMemo(() => received.filter((b) => b.status === 'PENDING').length, [received]);
  return { received, sent, loading, error, pending, reload };
}
