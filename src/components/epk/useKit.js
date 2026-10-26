import { useEffect, useState } from 'react';
import { Profiles, Reviews } from '../../lib/api';
import { buildEpk } from '../../lib/epk';

/** Loads a profile plus its public extras and builds the press kit. */
export default function useKit(id, preloaded) {
  const [state, setState] = useState({ kit: null, person: null, reviews: null, loading: true, error: null });
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    (async () => {
      try {
        const person = preloaded && preloaded.id === id ? preloaded : await Profiles.get(id);
        const rv = await Reviews.forUser(id, { take: 6 }).catch(() => null);
        if (alive) setState({ kit: buildEpk(person, { reviews: rv }), person, reviews: rv, loading: false, error: null });
      } catch (e) {
        if (alive) setState({ kit: null, person: null, reviews: null, loading: false, error: e });
      }
    })();
    return () => { alive = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
