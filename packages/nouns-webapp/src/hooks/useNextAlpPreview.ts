import { useEffect, useState } from 'react';
import { BigNumber, ethers } from 'ethers';
import config from '../config';
import { getAlpSeedFromBlockHash } from '@nouns/assets';
import { Auction } from '../wrappers/alpsAuction';
import { IAlpSeed } from '../wrappers/alpToken';
import { nextRewardAlp } from '../utils/alperAlp';
import { usePublicProvider } from './usePublicProvider';

// Safety net only; new blocks normally arrive instantly over the WebSocket subscription
const FALLBACK_POLL_MS = 12000;

export interface NextAlpPreview {
  alpId: BigNumber;
  seed: IAlpSeed;
  blockNumber: number;
  blockHash: string;
  // Unix seconds: the start of the block's 12-second slot, i.e. when this preview's window opened
  blockTimestamp: number;
}

/**
 * Once the latest auction has ended, the Alp that kicking off the next auction would put up for auction.
 * The seeder derives an Alp's traits from the hash of the block before the one it's minted in, so a
 * kick-off landing in the next block mints exactly this Alp; it changes with every new block.
 */
export const useNextAlpPreview = (auction: Auction | undefined, isLastAuction: boolean) => {
  const publicProvider = usePublicProvider();
  const [ended, setEnded] = useState(false);
  const [preview, setPreview] = useState<NextAlpPreview>();

  // Flip to ended exactly when the auction's time runs out
  const endTime = auction ? Number(auction.endTime) : 0;
  useEffect(() => {
    const msLeft = endTime * 1000 - Date.now();
    setEnded(msLeft <= 0);
    if (msLeft <= 0 || !endTime) return;
    const timer = setTimeout(() => setEnded(true), msLeft);
    return () => clearTimeout(timer);
  }, [endTime]);

  const enabled = !!auction && isLastAuction && ended && !auction.settled;
  const currentAlpId = auction?.alpId.toString();

  useEffect(() => {
    setPreview(undefined);
    if (!enabled || currentAlpId === undefined) return;
    // A reward Alp for the founders or Alpine Council is minted first; the auction gets the one after
    const reward = nextRewardAlp(BigNumber.from(currentAlpId));
    const alpId = reward ? reward.alpId.add(1) : BigNumber.from(currentAlpId).add(1);

    let cancelled = false;
    const show = (block: ethers.providers.Block | null | undefined) => {
      if (cancelled || !block?.hash) return;
      setPreview(current =>
        // Ignore a slower response for an older block, and repeats of the one already shown
        current && (current.blockNumber > block.number || current.blockHash === block.hash)
          ? current
          : {
              alpId,
              seed: getAlpSeedFromBlockHash(alpId, block.hash),
              blockNumber: block.number,
              blockHash: block.hash,
              blockTimestamp: block.timestamp,
            },
      );
    };

    // A kick-off sent now lands in the next block and mints from the latest block's hash, so the preview
    // has to switch the moment a new block arrives: subscribe to new blocks rather than poll
    const ws = new ethers.providers.WebSocketProvider(config.app.wsRpcUri);
    ws.on('block', (blockNumber: number) => {
      ws.getBlock(blockNumber).then(show).catch(() => undefined);
    });
    const poll = () => publicProvider.getBlock('latest').then(show).catch(() => undefined);
    poll();
    const timer = setInterval(poll, FALLBACK_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      ws.removeAllListeners();
      ws.destroy();
    };
  }, [enabled, currentAlpId, publicProvider]);

  return enabled ? preview : undefined;
};
