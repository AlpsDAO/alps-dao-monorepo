import { BigNumber as EthersBN, Contract, providers, utils } from 'ethers';
import BigNumber from 'bignumber.js';
import { isAlperAlp } from '../utils/alperAlp';
import { useAppSelector } from '../hooks';
import { AuctionState } from '../state/slices/auction';
import { useEffect, useState } from 'react';
import { useContracts } from '../hooks/useContracts';
import { usePublicProvider } from '../hooks/usePublicProvider';
import config from '../config';

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
      if (!alpsAuctionHouseProxy) {
        setAuction(undefined);
        return;
      }
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

/** The auction house's settings, as set on-chain (the DAO can change them by proposal). */
export interface AuctionSettings {
  reservePrice: EthersBN;
  /** seconds */
  duration: number;
  /** seconds a late bid extends the auction to */
  timeBuffer: number;
  minBidIncrementPercentage: number;
  paused: boolean;
}

// Shown until the chain has answered: the values at launch
const LAUNCH_SETTINGS: AuctionSettings = {
  reservePrice: utils.parseEther('0.08'),
  duration: 3 * 60 * 60,
  timeBuffer: 3 * 60,
  minBidIncrementPercentage: 2,
  paused: false,
};

const settingsAbi = [
  'function reservePrice() view returns (uint256)',
  'function duration() view returns (uint256)',
  'function timeBuffer() view returns (uint256)',
  'function minBidIncrementPercentage() view returns (uint8)',
  'function paused() view returns (bool)',
];

// One read shared by every component, refreshed every few minutes and when the tab regains focus
let latestSettings: AuctionSettings | undefined;
let lastRead = 0;
let reading: Promise<void> | undefined;
const listeners = new Set<(settings: AuctionSettings) => void>();

const readSettings = (provider: providers.Provider) => {
  if (reading || Date.now() - lastRead < 60_000) return;
  const house = new Contract(config.addresses.alpsAuctionHouseProxy, settingsAbi, provider);
  reading = Promise.all([
    house.reservePrice(),
    house.duration(),
    house.timeBuffer(),
    house.minBidIncrementPercentage(),
    house.paused(),
  ])
    .then(([reservePrice, duration, timeBuffer, minBidIncrementPercentage, paused]) => {
      latestSettings = {
        reservePrice,
        duration: duration.toNumber(),
        timeBuffer: timeBuffer.toNumber(),
        minBidIncrementPercentage,
        paused,
      };
      lastRead = Date.now();
      listeners.forEach(listener => listener(latestSettings!));
    })
    .catch(() => undefined)
    .finally(() => {
      reading = undefined;
    });
};

export const useAuctionSettings = (): AuctionSettings => {
  const provider = usePublicProvider();
  const [settings, setSettings] = useState(latestSettings ?? LAUNCH_SETTINGS);
  useEffect(() => {
    listeners.add(setSettings);
    const refresh = () => readSettings(provider);
    refresh();
    const timer = setInterval(refresh, 5 * 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      listeners.delete(setSettings);
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [provider]);
  return settings;
};

/** 10800 → "3 hours", 5400 → "90 minutes", 86400 → "1 day" */
export const formatAuctionLength = (seconds: number) => {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (seconds % 86400 === 0) return plural(seconds / 86400, 'day');
  if (seconds % 3600 === 0) return plural(seconds / 3600, 'hour');
  return plural(Math.round(seconds / 60), 'minute');
};

/** "3-hour", for "a new 3-hour auction" */
export const formatAuctionLengthAdjective = (seconds: number) =>
  formatAuctionLength(seconds).replace(/s$/, '').replace(' ', '-');

/** How many auctions fit in a day, back to back */
export const auctionsPerDay = (seconds: number) => Math.max(1, Math.floor(86400 / seconds));

/** The settings as words and numbers, for copy ("each auction runs for 3 hours") */
export const auctionNumbers = (settings: AuctionSettings) => ({
  length: formatAuctionLength(settings.duration),
  lengthAdjective: formatAuctionLengthAdjective(settings.duration),
  perDay: auctionsPerDay(settings.duration),
  reserve: utils.formatEther(settings.reservePrice).replace(/\.0$/, ''),
  buffer: formatAuctionLength(settings.timeBuffer),
});

export type AuctionNumbers = ReturnType<typeof auctionNumbers>;

export const useAuctionMinBidIncPercentage = () =>
  new BigNumber(useAuctionSettings().minBidIncrementPercentage);

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
