import { BigNumber, Contract } from 'ethers';
import { useEffect, useState } from 'react';
import config from '../config';
import { getReadProvider, TIMELOCK_ABI, TREASURY_ADDRESS } from '../utils/proposalActions/contracts';

/** Current on-chain settings a proposal might change, each undefined until read (or if it failed). */
export interface DaoSettings {
  reservePrice?: BigNumber;
  timeBuffer?: number;
  minBidIncrementPercentage?: number;
  auctionDuration?: number;
  auctionPaused?: boolean;
  votingDelay?: number;
  votingPeriod?: number;
  proposalThresholdBPS?: number;
  quorumVotesBPS?: number;
  /** Votes a proposer must exceed, at the current supply */
  proposalThreshold?: number;
  totalSupply?: number;
  /** Treasury (timelock) delay, in seconds */
  timelockDelay?: number;
  treasuryEth?: BigNumber;
}

const AUCTION_ABI = [
  'function reservePrice() view returns (uint256)',
  'function timeBuffer() view returns (uint256)',
  'function minBidIncrementPercentage() view returns (uint8)',
  'function duration() view returns (uint256)',
  'function paused() view returns (bool)',
];

const GOVERNOR_ABI = [
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThresholdBPS() view returns (uint256)',
  'function quorumVotesBPS() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
];

const TOKEN_ABI = ['function totalSupply() view returns (uint256)'];

const settle = <T>(promise: Promise<T>): Promise<T | undefined> => promise.catch(() => undefined);
const toNumber = (value: BigNumber | number | undefined) =>
  value === undefined ? undefined : BigNumber.from(value).toNumber();

const readSettings = async (): Promise<DaoSettings> => {
  const provider = getReadProvider();
  const { addresses } = config;
  const auction = new Contract(addresses.alpsAuctionHouseProxy, AUCTION_ABI, provider);
  const governor = new Contract(addresses.alpsDAOProxy, GOVERNOR_ABI, provider);
  const token = new Contract(addresses.alpsToken, TOKEN_ABI, provider);
  const timelock = new Contract(TREASURY_ADDRESS, TIMELOCK_ABI, provider);

  const [
    reservePrice,
    timeBuffer,
    minBidIncrementPercentage,
    auctionDuration,
    auctionPaused,
    votingDelay,
    votingPeriod,
    proposalThresholdBPS,
    quorumVotesBPS,
    proposalThreshold,
    totalSupply,
    timelockDelay,
    treasuryEth,
  ] = await Promise.all([
    settle<BigNumber>(auction.reservePrice()),
    settle<BigNumber>(auction.timeBuffer()),
    settle<number>(auction.minBidIncrementPercentage()),
    settle<BigNumber>(auction.duration()),
    settle<boolean>(auction.paused()),
    settle<BigNumber>(governor.votingDelay()),
    settle<BigNumber>(governor.votingPeriod()),
    settle<BigNumber>(governor.proposalThresholdBPS()),
    settle<BigNumber>(governor.quorumVotesBPS()),
    settle<BigNumber>(governor.proposalThreshold()),
    settle<BigNumber>(token.totalSupply()),
    settle<BigNumber>(timelock.delay()),
    settle(provider.getBalance(TREASURY_ADDRESS)),
  ]);

  return {
    reservePrice,
    timeBuffer: toNumber(timeBuffer),
    minBidIncrementPercentage,
    auctionDuration: toNumber(auctionDuration),
    auctionPaused,
    votingDelay: toNumber(votingDelay),
    votingPeriod: toNumber(votingPeriod),
    proposalThresholdBPS: toNumber(proposalThresholdBPS),
    quorumVotesBPS: toNumber(quorumVotesBPS),
    proposalThreshold: toNumber(proposalThreshold),
    totalSupply: toNumber(totalSupply),
    timelockDelay: toNumber(timelockDelay),
    treasuryEth,
  };
};

// Shared across the builder's forms, refreshed after a minute
let cached: { at: number; settings: Promise<DaoSettings> } | undefined;
const MAX_AGE_MS = 60_000;

export const useDaoSettings = (): DaoSettings | undefined => {
  const [settings, setSettings] = useState<DaoSettings>();

  useEffect(() => {
    if (!cached || Date.now() - cached.at > MAX_AGE_MS) {
      cached = { at: Date.now(), settings: readSettings().catch(() => ({})) };
    }
    let active = true;
    cached.settings.then(s => active && setSettings(s));
    return () => {
      active = false;
    };
  }, []);

  return settings;
};
