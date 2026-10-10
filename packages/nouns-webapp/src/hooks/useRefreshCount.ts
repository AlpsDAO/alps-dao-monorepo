import { useEffect, useState } from 'react';
import { getRefreshCount, subscribeToRefresh } from '../utils/liveData';

/**
 * Goes up whenever data should be read again: one of the viewer's transactions confirmed, or the tab came
 * back after a while. Put it in the dependencies of a read that only a transaction can change.
 */
export function useRefreshCount(): number {
  const [count, setCount] = useState(getRefreshCount);

  useEffect(() => {
    const update = () => setCount(getRefreshCount());
    const unsubscribe = subscribeToRefresh(update);
    update();
    return unsubscribe;
  }, []);

  return count;
}
