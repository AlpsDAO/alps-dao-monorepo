import { Auction } from '../wrappers/alpsAuction';
import { AuctionState } from '../state/slices/auction';
import { BigNumber } from '@ethersproject/bignumber';

export const isAlperAlp = (alpId: BigNumber) => {
  return alpId.mod(10).eq(0) || alpId.eq(0);
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
