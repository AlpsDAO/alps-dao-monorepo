import { useEffect, useState } from 'react';
import { getPublicProvider } from '../config';

/**
 * A function that takes a block number from the chain.
 * @returns block number
 */
export function useBlockNumber(): number | undefined {
  const [blockNumber, setBlockNumber] = useState<number | undefined>();

  useEffect(() => {
    async function getBlockNumber() {
      const publicProvider = getPublicProvider();
      const blockNumber = await publicProvider?.getBlockNumber();
      setBlockNumber(blockNumber);
    }

    getBlockNumber();
  }, []);

  return blockNumber;
}
