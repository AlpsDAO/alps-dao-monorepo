import { Auction } from '../wrappers/alpsAuction';
import { AuctionState } from '../state/slices/auction';
import { BigNumber } from '@ethersproject/bignumber';

// Reward Alps stop after this one: AlpsToken.mint() only diverts IDs <= 14600
export const LAST_REWARD_ALP_ID = 14600;

// Every 10th Alp goes to the founders
export const isFoundersAlp = (alpId: BigNumber) =>
  alpId.lte(LAST_REWARD_ALP_ID) && alpId.mod(10).eq(0);

// Every other 5th Alp (IDs ending in 5) goes to the Alpine Council
export const isAlpsCouncil = (alpId: BigNumber) =>
  alpId.lte(LAST_REWARD_ALP_ID) && alpId.mod(5).eq(0) && !alpId.mod(10).eq(0);

// Minted to the founders or the Alpine Council instead of being auctioned
export const isAlperAlp = (alpId: BigNumber) => isFoundersAlp(alpId) || isAlpsCouncil(alpId);

/** The reward Alp minted along with the next auction's Alp when the current auction is settled, if any. */
export const nextRewardAlp = (currentAlpId: BigNumber) => {
  const next = currentAlpId.add(1);
  if (isFoundersAlp(next)) return { alpId: next, recipient: 'founders' as const };
  if (isAlpsCouncil(next)) return { alpId: next, recipient: 'council' as const };
  return undefined;
};

const emptyAlperAuction = (onDisplayAuctionId: number): Auction => {
  return {
    amount: BigNumber.from(0).toJSON(),
    bidder: '',
    startTime: BigNumber.from(0).toJSON(),
    endTime: BigNumber.from(0).toJSON(),
    alpId: BigNumber.from(onDisplayAuctionId).toJSON(),
    settled: false,
  };
};

const findAuction = (id: BigNumber, auctions: AuctionState[]): Auction | undefined => {
  return auctions.find(auction => {
    return BigNumber.from(auction.activeAuction?.alpId).eq(id);
  })?.activeAuction;
};

/**
 *
 * @param alpId
 * @param pastAuctions
 * @returns empty `Auction` object with `startTime` set to auction after param `alpId`
 */
export const generateEmptyAlperAuction = (
  alpId: BigNumber,
  pastAuctions: AuctionState[],
): Auction => {
  const alperAuction = emptyAlperAuction(alpId.toNumber());
  // use alperAuction.alpId + 1 to get mint time
  const auctionAbove = findAuction(alpId.add(1), pastAuctions);
  const auctionAboveStartTime = auctionAbove && BigNumber.from(auctionAbove.startTime);
  if (auctionAboveStartTime) alperAuction.startTime = auctionAboveStartTime.toJSON();

  return alperAuction;
};
