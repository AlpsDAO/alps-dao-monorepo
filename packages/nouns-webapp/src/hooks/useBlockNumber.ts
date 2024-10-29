import { useEffect, useState } from 'react';
import { usePublicProvider } from './usePublicProvider';

/**
 * A function that takes a block number from the chain.
 * @returns block number
 */
export function useBlockNumber(): number | undefined {
  const publicProvider = usePublicProvider();
  const [blockNumber, setBlockNumber] = useState<number | undefined>();

  useEffect(() => {
    async function getBlockNumber() {
      const blockNumber = await publicProvider?.getBlockNumber();
      setBlockNumber(blockNumber);
    }

    getBlockNumber();
  }, []);

  return blockNumber;
}
