import { BigNumber as EthersBN, ethers } from 'ethers';
import config, { cache, cacheKey, CHAIN_ID } from '../config';
import { useQuery } from '@apollo/client';
import { seedsQuery } from './subgraph';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useContracts } from '../hooks/useContracts';
import { useTransaction } from '../hooks/useTransaction';
import { WalletContext } from '../contexts/WalletContext';

interface AlpToken {
  name: string;
  description: string;
  image: string;
}

export interface IAlpSeed {
  accessory: number;
  background: number;
  body: number;
  glasses: number;
  head: number;
}

export enum AlpsTokenContractFunction {
  delegateVotes = 'votesToDelegate',
}

const seedCacheKey = cacheKey(cache.seed, CHAIN_ID, config.addresses.alpsToken);

const isSeedValid = (seed: Record<string, any> | undefined) => {
  const expectedKeys = ['background', 'body', 'accessory', 'head', 'glasses'];
  const hasExpectedKeys = expectedKeys.every(key => (seed || {}).hasOwnProperty(key));
  const hasValidValues = Object.values(seed || {}).some(v => v !== 0);
  return hasExpectedKeys && hasValidValues;
};

export const useAlpToken = (alpId?: ethers.BigNumber) => {
  const [alp, setAlp] = useState<string | undefined>();
  const { alpsDaoToken } = useContracts();

  useEffect(() => {
    async function getAlp(alpId?: ethers.BigNumber) {
      if (alpId === undefined || !alpsDaoToken) {
        setAlp(undefined);
        return;
      }
      try {
        const dataURI = await alpsDaoToken.dataURI(alpId);
        setAlp(dataURI);
      }
      catch {}
    }
    
    getAlp(alpId);
  }, [alpId]);

  if (!alp) {
    return;
  }

  const alpImgData = alp.split(';base64,').pop() as string;
  const json: AlpToken = JSON.parse(atob(alpImgData));

  return json;
};

const seedArrayToObject = (seeds: (IAlpSeed & { id: string })[]) => {
  return seeds.reduce<Record<string, IAlpSeed>>((acc, seed) => {
    acc[seed.id] = {
      background: Number(seed.background),
      body: Number(seed.body),
      accessory: Number(seed.accessory),
      head: Number(seed.head),
      glasses: Number(seed.glasses),
    };
    return acc;
  }, {});
};

// Seeds never change once an Alp is minted, so they're cached for good: parsed from localStorage once,
// kept in memory, and written back as new ones arrive
let seedCache: Record<string, IAlpSeed> | undefined;

const readSeedCache = (): Record<string, IAlpSeed> => {
  if (!seedCache) {
    try {
      seedCache = JSON.parse(localStorage.getItem(seedCacheKey) ?? '{}') ?? {};
    } catch {
      seedCache = {};
    }
  }
  return seedCache!;
};

const cacheSeeds = (seeds: Record<string, IAlpSeed>) => {
  const current = readSeedCache();
  if (Object.keys(seeds).every(id => current[id])) return;
  seedCache = { ...current, ...seeds };
  try {
    localStorage.setItem(seedCacheKey, JSON.stringify(seedCache));
  } catch {}
};

export const useAlpSeed = (alpId?: EthersBN) => {
  // Keyed by the id string: callers pass a new BigNumber on every render
  const id = alpId?.toString();
  const cached = id !== undefined ? readSeedCache()[id] : undefined;

  // One query for every seed (shared through Apollo's cache) fills in Alps missing from the cache,
  // e.g. ones minted since it was written
  const { data, error } = useQuery(seedsQuery(), { skip: id === undefined || !!cached });
  const indexed = useMemo(() => (data?.seeds ? seedArrayToObject(data.seeds) : undefined), [data]);
  useEffect(() => {
    if (indexed) cacheSeeds(indexed);
  }, [indexed]);

  // Only Alps too new for the subgraph are read from the token contract
  const [fromChain, setFromChain] = useState<IAlpSeed | undefined>();
  const { alpsDaoToken } = useContracts();
  const needsChain = id !== undefined && !cached && ((indexed && !indexed[id]) || !!error);
  useEffect(() => {
    if (!needsChain || !alpsDaoToken || id === undefined) return;
    let cancelled = false;
    alpsDaoToken
      .seeds(id)
      .then(seed => {
        if (cancelled || !isSeedValid(seed)) return;
        const { accessory, background, body, glasses, head } = seed;
        cacheSeeds({ [id]: { accessory, background, body, glasses, head } });
        setFromChain({ accessory, background, body, glasses, head });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [needsChain, id, alpsDaoToken]);

  return cached ?? (id !== undefined ? indexed?.[id] : undefined) ?? fromChain;
};

export const useUserVotes = (): number | undefined => {
  const { account } = useContext(WalletContext);
  return useAccountVotes(account ?? ethers.constants.AddressZero);
};

export const useAccountVotes = (account?: string): number | undefined => {
  const [votes, setVotes] = useState<ethers.BigNumber | undefined>();
  const { alpsDaoToken } = useContracts();

  useEffect(() => {
    async function getVotes(address?: string) {
      if (!address || !alpsDaoToken) {
        setVotes(undefined);
        return;
      }
      try {
        const votes = await alpsDaoToken.getCurrentVotes(address);
        setVotes(votes);
      }
      catch {}
    }
    
    getVotes(account);
  }, [account]);

  return votes?.toNumber();
};

export const useUserDelegatee = (): string | undefined => {
  const [delegate, setDelegate] = useState<string | undefined>();
  const { alpsDaoToken } = useContracts();
  const { account } = useContext(WalletContext);

  useEffect(() => {
    async function getDelegate(address?: string) {
      if (!address || !alpsDaoToken) {
        setDelegate(undefined);
        return;
      }
      try {
        const delegates = await alpsDaoToken.delegates(address);
        setDelegate(delegates);
      }
      catch {}
    }
    
    getDelegate(account);
  }, [account]);

  return delegate;
};

export const useUserVotesAsOfBlock = (block: number | undefined): number | undefined => {
  const [votes, setVotes] = useState<ethers.BigNumber | undefined>();
  const { alpsDaoToken } = useContracts();
  const { account } = useContext(WalletContext);

  useEffect(() => {
    async function getVotes(address?: string, block?: number) {
      if (!address || !block || !alpsDaoToken) {
        setVotes(undefined);
        return;
      }
      try {
        const votes = await alpsDaoToken.getPriorVotes(address, block);
        setVotes(votes);
      }
      catch {}
    }
    
    getVotes(account, block);
  }, [account, block]);

  return votes?.toNumber();
};

export const useDelegateVotes = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoToken } = useContracts();

  const delegateVotes = (delegatee: string) => {
    if (!alpsDaoToken) return;
    transact(alpsDaoToken.delegate(delegatee));
  };

  return { delegateVotes, delegateVotesState: status };
};

export const useAlpTokenBalance = (address?: string): number | undefined => {
  const [tokenBalance, setTokenBalance] = useState<ethers.BigNumber | undefined>(undefined);
  const { alpsDaoToken } = useContracts();

  useEffect(() => {
    async function balanceOf(address?: string) {
      if (!address || !alpsDaoToken) {
        setTokenBalance(undefined);
        return;
      }
      try {
        const balance = await alpsDaoToken.balanceOf(address);
        setTokenBalance(balance);
      }
      catch {}
    }
    
    balanceOf(address);
  }, [address]);
  
  return tokenBalance?.toNumber();
};

export const useUserAlpTokenBalance = (): number | undefined => {
  const { account } = useContext(WalletContext);
  return useAlpTokenBalance(account);
};
