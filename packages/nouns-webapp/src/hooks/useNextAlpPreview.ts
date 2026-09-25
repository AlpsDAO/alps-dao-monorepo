import { useEffect, useState } from 'react';
import { BigNumber, ethers } from 'ethers';
import config from '../config';
import { getAlpSeedFromBlockHash } from '@nouns/assets';
import { IAlpSeed } from '../wrappers/alpToken';
import { nextRewardAlp } from '../utils/alperAlp';
import { usePublicProvider } from './usePublicProvider';
import { useAppSelector } from '../hooks';

// Safety net for when the new-block subscription is still connecting or has dropped: it only polls while
// the subscription hasn't delivered a block for longer than a block takes
const FALLBACK_POLL_MS = 3000;
const SUBSCRIPTION_QUIET_MS = 13000;
// Blocks usually reach us this long after their slot starts
const TYPICAL_ARRIVAL_DELAY_S = 2.5;
// A remembered preview younger than this is almost certainly still the current block's
const REUSE_WITHIN_S = 10;

export interface NextAlpPreview {
  alpId: BigNumber;
  seed: IAlpSeed;
  blockNumber: number;
  blockHash: string;
  // Unix seconds when this Alp became the one a kick-off mints: when its block reached us, so the
  // countdown runs block arrival to block arrival
  since: number;
}

// The latest preview outlives the component, so coming back to the latest Alp (from an older one or
// another page) shows it straight away while the subscription catches up
let lastPreview: NextAlpPreview | undefined;

const reusable = (alpId: BigNumber) =>
  lastPreview && lastPreview.alpId.eq(alpId) && Date.now() / 1000 - lastPreview.since < REUSE_WITHIN_S
    ? lastPreview
    : undefined;

// A reward Alp for the founders or Alpine Council is minted first; the auction gets the one after
const auctionedAfter = (alpId: BigNumber) => {
  const reward = nextRewardAlp(alpId);
  return reward ? reward.alpId.add(1) : alpId.add(1);
};

/**
 * Once the latest auction has ended, the Alp that kicking off the next auction would put up for auction.
 * The seeder derives an Alp's traits from the hash of the block before the one it's minted in, so a
 * kick-off landing in the next block mints exactly this Alp; it changes with every new block.
 * It follows the latest auction whichever Alp is on display, so it's ready when the latest comes back.
 */
export const useNextAlpPreview = () => {
  const auction = useAppSelector(state => state.auction.activeAuction);
  const publicProvider = usePublicProvider();
  const currentAlpId = auction ? BigNumber.from(auction.alpId).toString() : undefined;
  const endTime = auction ? BigNumber.from(auction.endTime).toNumber() : 0;
  const hasEnded = () => !!endTime && endTime * 1000 <= Date.now();

  const [ended, setEnded] = useState(hasEnded);
  const [preview, setPreview] = useState<NextAlpPreview | undefined>(() =>
    currentAlpId !== undefined ? reusable(auctionedAfter(BigNumber.from(currentAlpId))) : undefined,
  );

  // Flip to ended exactly when the auction's time runs out
  useEffect(() => {
    const msLeft = endTime * 1000 - Date.now();
    setEnded(!!endTime && msLeft <= 0);
    if (msLeft <= 0 || !endTime) return;
    const timer = setTimeout(() => setEnded(true), msLeft);
    return () => clearTimeout(timer);
  }, [endTime]);

  const enabled = !!auction && ended && !auction.settled;

  useEffect(() => {
    if (!enabled || currentAlpId === undefined) {
      setPreview(undefined);
      return;
    }
    const alpId = auctionedAfter(BigNumber.from(currentAlpId));
    setPreview(reusable(alpId));

    let cancelled = false;
    // fresh: pushed by the new-block subscription as it landed; otherwise polled, possibly mid-block
    const show = (block: ethers.providers.Block | null | undefined, fresh: boolean) => {
      if (cancelled || !block?.hash) return;
      const since = fresh ? Date.now() / 1000 : block.timestamp + TYPICAL_ARRIVAL_DELAY_S;
      setPreview(current => {
        // Ignore a slower response for an older block, and repeats of the one already shown
        if (current && (current.blockNumber > block.number || current.blockHash === block.hash)) {
          return current;
        }
        lastPreview = {
          alpId,
          seed: getAlpSeedFromBlockHash(alpId, block.hash),
          blockNumber: block.number,
          blockHash: block.hash,
          since,
        };
        return lastPreview;
      });
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
