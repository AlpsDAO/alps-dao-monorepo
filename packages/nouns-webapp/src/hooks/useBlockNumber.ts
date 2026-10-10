import { useEffect, useState } from 'react';
import { getLatestBlock, LatestBlock, subscribeToBlocks } from '../utils/liveData';

/**
 * The chain's latest block (number and timestamp), kept current: one shared read every 12 seconds while
 * the tab is in view.
 */
export function useLatestBlock(): LatestBlock | undefined {
  const [block, setBlock] = useState(getLatestBlock);

  useEffect(() => {
    const update = () => setBlock(getLatestBlock());
    const unsubscribe = subscribeToBlocks(update);
    // A newer block may have arrived between this component's render and now
    update();
    return unsubscribe;
  }, []);

  return block;
}

/** The chain's latest block number, kept current. */
export function useBlockNumber(): number | undefined {
  return useLatestBlock()?.number;
}
