import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

export interface BidEvent {
  alpId: BigNumberish;
  sender: string;
  value: BigNumberish;
  extended: boolean;
  transactionHash: string;
  timestamp: BigNumberish;
}

export interface AuctionCreateEvent {
  alpId: BigNumberish;
  startTime: BigNumberish;
  endTime: BigNumberish;
  settled: boolean;
}

export interface AuctionSettledEvent {
  alpId: BigNumberish;
  winner: string;
  amount: BigNumberish;
}

export interface AuctionExtendedEvent {
  alpId: BigNumberish;
  endTime: BigNumberish;
}

export interface Bid {
  alpId: BigNumber;
  sender: string;
  value: BigNumber;
  extended: boolean;
  transactionHash: string;
  timestamp: BigNumber;
}
