import { BigNumber as EthersBN, ethers } from 'ethers';
import config, { cache, cacheKey, CHAIN_ID } from '../config';
import { useQuery } from '@apollo/client';
import { seedsQuery } from './subgraph';
import { useContext, useEffect, useState } from 'react';
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

const useAlpSeeds = () => {
  const cache = localStorage.getItem(seedCacheKey);
  const cachedSeeds = cache ? JSON.parse(cache) : undefined;
  const { data } = useQuery(seedsQuery(), {
    skip: !!cachedSeeds,
  });

  useEffect(() => {
    if (!cachedSeeds && data?.seeds?.length) {
      localStorage.setItem(seedCacheKey, JSON.stringify(seedArrayToObject(data.seeds)));
    }
  }, [data, cachedSeeds]);

  return cachedSeeds;
};

export const useAlpSeed = (alpId?: EthersBN) => {
  const seeds = useAlpSeeds();
  const seed = seeds?.[alpId?.toString() ?? ''];
  
  const [response, setResponse] = useState<IAlpSeed | undefined>();
  const { alpsDaoToken } = useContracts();

  useEffect(() => {
    async function getSeeds(alpId?: ethers.BigNumber) {
      if (!alpId || !alpsDaoToken) {
        setResponse(undefined);
        return;
      }
      try {
        const seedsResponse = await alpsDaoToken.seeds(alpId);
        setResponse(seedsResponse);
      }
      catch {}
    }
    
    getSeeds(alpId);
  }, [alpId]);
  
  if (alpId && response) {
    const seedCache = localStorage.getItem(seedCacheKey);
    if (seedCache && isSeedValid(response)) {
      const updatedSeedCache = JSON.stringify({
        ...JSON.parse(seedCache),
        [alpId.toString()]: {
          accessory: response.accessory,
          background: response.background,
          body: response.body,
          glasses: response.glasses,
          head: response.head,
        },
      });
      localStorage.setItem(seedCacheKey, updatedSeedCache);
    }
    return response;
  }
  return seed;
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
