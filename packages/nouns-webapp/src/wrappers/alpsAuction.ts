import { BigNumber as EthersBN } from 'ethers';
import BigNumber from 'bignumber.js';
import { isAlperAlp } from '../utils/alperAlp';
import { useAppSelector } from '../hooks';
import { AuctionState } from '../state/slices/auction';
import { useEffect, useState } from 'react';
import { useContracts } from '../hooks/useContracts';

export enum AuctionHouseContractFunction {
  auction = 'auction',
  duration = 'duration',
  minBidIncrementPercentage = 'minBidIncrementPercentage',
  alps = 'alps',
  createBid = 'createBid',
  settleCurrentAndCreateNewAuction = 'settleCurrentAndCreateNewAuction',
}

export interface Auction {
  amount: EthersBN;
  bidder: string;
  endTime: EthersBN;
  startTime: EthersBN;
  alpId: EthersBN;
  settled: boolean;
}

export const useAuction = () => {
  const [auction, setAuction] = useState<Auction | undefined>();
  const { alpsAuctionHouseProxy } = useContracts();

  useEffect(() => {
    async function getAuction() {
      try {
        const auctionResult = await alpsAuctionHouseProxy.auction();
        setAuction(auctionResult);
      }
      catch {}
    }

    getAuction();
  }, []);

  return auction;
};

export const useAuctionMinBidIncPercentage = () => {
  const [minBidIncrement, setMinBidIncrement] = useState<number | undefined>();
  const { alpsAuctionHouseProxy } = useContracts();

  useEffect(() => {
    async function getMinBidIncrement() {
      try {
        const perc = await alpsAuctionHouseProxy.minBidIncrementPercentage();
        setMinBidIncrement(perc);
      }
      catch {}
    }

    getMinBidIncrement();
  }, []);

  if (!minBidIncrement) {
    return;
  }

  return new BigNumber(minBidIncrement);
};

/**
 * Computes timestamp after which a Alp could vote
 * @param alpId TokenId of Alp
 * @returns Unix timestamp after which Alp could vote
 */
export const useAlpCanVoteTimestamp = (alpId: number) => {
  const nextAlpId = alpId + 1;

  const nextAlpIdForQuery = isAlperAlp(EthersBN.from(nextAlpId)) ? nextAlpId + 1 : nextAlpId;

  const pastAuctions = useAppSelector(state => state.pastAuctions.pastAuctions);

  const maybeAlpCanVoteTimestamp = pastAuctions.find((auction: AuctionState, i: number) => {
    const maybeAlpId = auction.activeAuction?.alpId;
    return maybeAlpId ? EthersBN.from(maybeAlpId).eq(EthersBN.from(nextAlpIdForQuery)) : false;
  })?.activeAuction?.startTime;

  if (!maybeAlpCanVoteTimestamp) {
    // This state only occurs during loading flashes
    return EthersBN.from(0);
  }

  return EthersBN.from(maybeAlpCanVoteTimestamp);
};
