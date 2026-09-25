import { useEffect, useState } from 'react';
import { BigNumber, ethers } from 'ethers';
import config from '../config';
import { getAlpSeedFromBlockHash } from '@nouns/assets';
import { Auction } from '../wrappers/alpsAuction';
import { IAlpSeed } from '../wrappers/alpToken';
import { nextRewardAlp } from '../utils/alperAlp';
import { usePublicProvider } from './usePublicProvider';

// Safety net for when the new-block subscription is still connecting or has dropped: it only polls while
// the subscription hasn't delivered a block for longer than a block takes
const FALLBACK_POLL_MS = 3000;
const SUBSCRIPTION_QUIET_MS = 13000;
// Blocks usually reach us this long after their slot starts
const TYPICAL_ARRIVAL_DELAY_S = 2.5;

export interface NextAlpPreview {
  alpId: BigNumber;
  seed: IAlpSeed;
  blockNumber: number;
  blockHash: string;
  // Unix seconds when this Alp became the one a kick-off mints: when its block reached us, so the
  // countdown runs block arrival to block arrival
  since: number;
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
    // fresh: pushed by the new-block subscription as it landed; otherwise polled, possibly mid-block
    const show = (block: ethers.providers.Block | null | undefined, fresh: boolean) => {
      if (cancelled || !block?.hash) return;
      const since = fresh ? Date.now() / 1000 : block.timestamp + TYPICAL_ARRIVAL_DELAY_S;
      setPreview(current =>
        // Ignore a slower response for an older block, and repeats of the one already shown
        current && (current.blockNumber > block.number || current.blockHash === block.hash)
          ? current
          : {
              alpId,
              seed: getAlpSeedFromBlockHash(alpId, block.hash),
              blockNumber: block.number,
              blockHash: block.hash,
              since,
            },
      );
    };

    // A kick-off sent now lands in the next block and mints from the latest block's hash, so the preview
    // has to switch the moment a new block arrives: subscribe to new blocks rather than poll
    const ws = new ethers.providers.WebSocketProvider(config.app.wsRpcUri);
    let lastPushedAt = 0;
    ws.on('block', (blockNumber: number) => {
      lastPushedAt = Date.now();
      ws.getBlock(blockNumber)
        .then(block => show(block, true))
        .catch(() => undefined);
    });
    const poll = () =>
      Date.now() - lastPushedAt > SUBSCRIPTION_QUIET_MS &&
      publicProvider
        .getBlock('latest')
        .then(block => show(block, false))
        .catch(() => undefined);
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
