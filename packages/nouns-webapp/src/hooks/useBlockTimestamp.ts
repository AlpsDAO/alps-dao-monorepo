import { useEffect, useState } from 'react';
import { getPublicProvider } from '../config';

/**
 * A function that takes a block number from the chain and returns the timestamp of when the block occurred.
 * @param blockNumber target block number to retrieve the timestamp for
 * @returns unix timestamp of block number
 */
export function useBlockTimestamp(blockNumber: number | undefined): number | undefined {
  const [blockTimestamp, setBlockTimestamp] = useState<number | undefined>();

  useEffect(() => {
    async function updateBlockTimestamp() {
      if (!blockNumber) return;
      const publicProvider = getPublicProvider();
      const blockData = await publicProvider?.getBlock(blockNumber);
      setBlockTimestamp(blockData?.timestamp || undefined);
    }

    updateBlockTimestamp();
  }, [blockNumber]);

  return blockTimestamp;
}
