import { useEffect, useRef, useState } from 'react';
import { usePublicProvider } from './usePublicProvider';

/**
 * A function that takes a block number from the chain and returns the timestamp of when the block occurred.
 * @param blockNumber target block number to retrieve the timestamp for
 * @returns unix timestamp of block number
 */
export function useBlockTimestamp(blockNumber: number | undefined): number | undefined {
  const publicProvider = usePublicProvider();
  const [blockTimestamp, setBlockTimestamp] = useState<number | undefined>();

  useEffect(() => {
    async function updateBlockTimestamp() {
      if (!blockNumber) return;
      const blockData = await publicProvider?.getBlock(blockNumber);
      setBlockTimestamp(blockData?.timestamp || undefined);
    }

    updateBlockTimestamp();
  }, [blockNumber]);

  return blockTimestamp;
}

/**
 * Timestamps for several past blocks, keyed by block number. Blocks without a timestamp yet are absent.
 */
export function useBlockTimestamps(blockNumbers: number[]): Record<number, number> {
  const publicProvider = usePublicProvider();
  const [timestamps, setTimestamps] = useState<Record<number, number>>({});
  const requested = useRef(new Set<number>());
  const key = Array.from(new Set(blockNumbers)).sort().join(',');

  useEffect(() => {
    const missing = key
      .split(',')
      .filter(Boolean)
      .map(Number)
      .filter(block => !requested.current.has(block));
    if (!missing.length) return;
    missing.forEach(block => requested.current.add(block));
    Promise.all(
      missing.map(block =>
        publicProvider
          .getBlock(block)
          .then(data => [block, data?.timestamp] as const)
          .catch(() => {
            // Let a later render retry it
            requested.current.delete(block);
            return [block, undefined] as const;
          }),
      ),
    ).then(results =>
      setTimestamps(prev => {
        const next = { ...prev };
        results.forEach(([block, timestamp]) => {
          if (timestamp) next[block] = timestamp;
        });
        return next;
      }),
    );
  }, [key, publicProvider]);

  return timestamps;
}
