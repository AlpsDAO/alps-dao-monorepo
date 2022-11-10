import { BigNumber } from '@ethersproject/bignumber';
import { useAppSelector } from '../hooks';
import { generateEmptyAlperAuction, isAlperAlp } from '../utils/alperAlp';
import { Bid, BidEvent } from '../utils/types';
import { Auction } from './alpsAuction';

const deserializeAuction = (reduxSafeAuction: Auction): Auction => {
  return {
    amount: BigNumber.from(reduxSafeAuction.amount),
    bidder: reduxSafeAuction.bidder,
    startTime: BigNumber.from(reduxSafeAuction.startTime),
    endTime: BigNumber.from(reduxSafeAuction.endTime),
    alpId: BigNumber.from(reduxSafeAuction.alpId),
    settled: false,
  };
};

const deserializeBid = (reduxSafeBid: BidEvent): Bid => {
  return {
    alpId: BigNumber.from(reduxSafeBid.alpId),
    sender: reduxSafeBid.sender,
    value: BigNumber.from(reduxSafeBid.value),
    extended: reduxSafeBid.extended,
    transactionHash: reduxSafeBid.transactionHash,
    timestamp: BigNumber.from(reduxSafeBid.timestamp),
  };
};
const deserializeBids = (reduxSafeBids: BidEvent[]): Bid[] => {
  return reduxSafeBids
    .map(bid => deserializeBid(bid))
    .sort((a: Bid, b: Bid) => {
      return b.timestamp.toNumber() - a.timestamp.toNumber();
    });
};

const useOnDisplayAuction = (): Auction | undefined => {
  const lastAuctionAlpId = useAppSelector(state => state.auction.activeAuction?.alpId);
  const onDisplayAuctionAlpId = useAppSelector(
    state => state.onDisplayAuction.onDisplayAuctionAlpId,
  );
  const currentAuction = useAppSelector(state => state.auction.activeAuction);
  const pastAuctions = useAppSelector(state => state.pastAuctions.pastAuctions);

  if (
    onDisplayAuctionAlpId === undefined ||
    lastAuctionAlpId === undefined ||
    currentAuction === undefined ||
    !pastAuctions
  )
    return undefined;

  // current auction
  if (BigNumber.from(onDisplayAuctionAlpId).eq(lastAuctionAlpId)) {
    return deserializeAuction(currentAuction);
  }

  // alper auction
  if (isAlperAlp(BigNumber.from(onDisplayAuctionAlpId))) {
    const emptyAlperAuction = generateEmptyAlperAuction(
      BigNumber.from(onDisplayAuctionAlpId),
      pastAuctions,
    );

    return deserializeAuction(emptyAlperAuction);
  }

  // past auction
  const reduxSafeAuction: Auction | undefined = pastAuctions.find(auction => {
    const alpId = auction.activeAuction && BigNumber.from(auction.activeAuction.alpId);
    return alpId && alpId.toNumber() === onDisplayAuctionAlpId;
  })?.activeAuction;

  return reduxSafeAuction ? deserializeAuction(reduxSafeAuction) : undefined;
};

export const useAuctionBids = (auctionAlpId: BigNumber): Bid[] | undefined => {
  const lastAuctionAlpId = useAppSelector(state => state.onDisplayAuction.lastAuctionAlpId);
  const lastAuctionBids = useAppSelector(state => state.auction.bids);
  const pastAuctions = useAppSelector(state => state.pastAuctions.pastAuctions);

  // auction requested is active auction
  if (lastAuctionAlpId === auctionAlpId.toNumber()) {
    return deserializeBids(lastAuctionBids);
  } else {
    // find bids for past auction requested
    const bidEvents: BidEvent[] | undefined = pastAuctions.find(auction => {
      const alpId = auction.activeAuction && BigNumber.from(auction.activeAuction.alpId);
      return alpId && alpId.eq(auctionAlpId);
    })?.bids;

    return bidEvents && deserializeBids(bidEvents);
  }
};

export default useOnDisplayAuction;
