import { useContractCall, useContractFunction, useEthers } from '@usedapp/core';
import { BigNumber as EthersBN, ethers, utils } from 'ethers';
import { AlpsTokenABI, AlpsTokenFactory } from '@nouns/contracts';
import config, { cache, cacheKey, CHAIN_ID } from '../config';
import { useQuery } from '@apollo/client';
import { seedsQuery } from './subgraph';
import { useEffect } from 'react';

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

const abi = new utils.Interface(AlpsTokenABI);
const seedCacheKey = cacheKey(cache.seed, CHAIN_ID, config.addresses.alpsToken);

const isSeedValid = (seed: Record<string, any> | undefined) => {
  const expectedKeys = ['background', 'body', 'accessory', 'head', 'glasses'];
  const hasExpectedKeys = expectedKeys.every(key => (seed || {}).hasOwnProperty(key));
  const hasValidValues = Object.values(seed || {}).some(v => v !== 0);
  return hasExpectedKeys && hasValidValues;
};

export const useAlpToken = (alpId: EthersBN) => {
  const [alp] =
    useContractCall<[string]>({
      abi,
      address: config.addresses.alpsToken,
      method: 'dataURI',
      args: [alpId],
    }) || [];

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

export const useAlpSeed = (alpId: EthersBN) => {
  const seeds = useAlpSeeds();
  const seed = seeds?.[alpId.toString()];
  // prettier-ignore
  const request = seed ? false : {
    abi,
    address: config.addresses.alpsToken,
    method: 'seeds',
    args: [alpId],
  };
  const response = useContractCall<IAlpSeed>(request);
  if (response) {
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
  const { account } = useEthers();
  return useAccountVotes(account ?? ethers.constants.AddressZero);
};

export const useAccountVotes = (account?: string): number | undefined => {
  const [votes] =
    useContractCall<[EthersBN]>({
      abi,
      address: config.addresses.alpsToken,
      method: 'getCurrentVotes',
      args: [account],
    }) || [];
  return votes?.toNumber();
};

export const useUserDelegatee = (): string | undefined => {
  const { account } = useEthers();
  const [delegate] =
    useContractCall<[string]>({
      abi,
      address: config.addresses.alpsToken,
      method: 'delegates',
      args: [account],
    }) || [];
  return delegate;
};

export const useUserVotesAsOfBlock = (block: number | undefined): number | undefined => {
  const { account } = useEthers();
  // Check for available votes
  const [votes] =
    useContractCall<[EthersBN]>({
      abi,
      address: config.addresses.alpsToken,
      method: 'getPriorVotes',
      args: [account, block],
    }) || [];
  return votes?.toNumber();
};

export const useDelegateVotes = () => {
  const alpsToken = new AlpsTokenFactory().attach(config.addresses.alpsToken);

  const { send, state } = useContractFunction(alpsToken, 'delegate');

  return { send, state };
};

export const useAlpTokenBalance = (address: string): number | undefined => {
  const [tokenBalance] =
    useContractCall<[EthersBN]>({
      abi,
      address: config.addresses.alpsToken,
      method: 'balanceOf',
      args: [address],
    }) || [];
  return tokenBalance?.toNumber();
};

export const useUserAlpTokenBalance = (): number | undefined => {
  const { account } = useEthers();

  const [tokenBalance] =
    useContractCall<[EthersBN]>({
      abi,
      address: config.addresses.alpsToken,
      method: 'balanceOf',
      args: [account],
    }) || [];
  return tokenBalance?.toNumber();
};
