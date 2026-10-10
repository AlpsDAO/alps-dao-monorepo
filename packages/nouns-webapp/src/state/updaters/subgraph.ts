import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { useRefreshCount } from '../../hooks/useRefreshCount';

/**
 * Fetches the subgraph queries on screen again whenever the app refreshes (one of the viewer's
 * transactions confirmed, or the tab came back). A query can opt out with `context: { noRefresh: true }`.
 */
const Updater = (): null => {
  const client = useApolloClient();
  const refreshCount = useRefreshCount();

  useEffect(() => {
    if (!refreshCount) return;
    client
      .refetchQueries({
        include: 'active',
        onQueryUpdated: query => !query.options.context?.noRefresh,
      })
      // A failed fetch shows on the query itself
      .catch(() => {});
  }, [client, refreshCount]);

  return null;
};

export default Updater;
