import { BigNumber, Contract, utils } from 'ethers';
import { useEffect, useState } from 'react';
import {
  getReadProvider,
  knownToken,
  TokenInfo,
  TREASURY_ADDRESS,
} from '../utils/proposalActions/contracts';

const TOKEN_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
];
// Some early tokens (MKR, SAI) return their symbol as bytes32
const BYTES32_SYMBOL_ABI = ['function symbol() view returns (bytes32)'];

const infoCache: Record<string, Promise<TokenInfo | undefined>> = {};

const readTokenInfo = async (address: string): Promise<TokenInfo | undefined> => {
  const known = knownToken(address);
  if (known) return known;
  const provider = getReadProvider();
  const token = new Contract(address, TOKEN_ABI, provider);
  const decimals: number | undefined = await token.decimals().catch(() => undefined);
  if (decimals === undefined) return undefined;
  let symbol: string | undefined = await token.symbol().catch(() => undefined);
  if (symbol === undefined) {
    const raw = await new Contract(address, BYTES32_SYMBOL_ABI, provider)
      .symbol()
      .catch(() => undefined);
    try {
      symbol = raw ? utils.parseBytes32String(raw) : undefined;
    } catch {}
  }
  return { address: utils.getAddress(address), symbol: symbol || '?', decimals };
};

/** An ERC-20's symbol and decimals; undefined while loading or if the address isn't a token. */
export const tokenInfo = (address: string) => {
  const key = address.toLowerCase();
  if (!infoCache[key]) {
    infoCache[key] = readTokenInfo(address).catch(() => undefined);
  }
  return infoCache[key];
};

export const useTokenInfo = (address: string | undefined) => {
  const [info, setInfo] = useState<{ address: string; info?: TokenInfo; loading: boolean }>();

  useEffect(() => {
    if (!address || !utils.isAddress(address)) {
      setInfo(undefined);
      return;
    }
    let active = true;
    const known = knownToken(address);
    setInfo({ address, info: known, loading: !known });
    if (known) return;
    tokenInfo(address).then(result => active && setInfo({ address, info: result, loading: false }));
    return () => {
      active = false;
    };
  }, [address]);

  if (info && info.address === address) return { info: info.info, loading: info.loading };
  return { info: undefined, loading: !!address && utils.isAddress(address) };
};

/** How much of a token the treasury holds right now. */
export const useTreasuryTokenBalance = (address: string | undefined) => {
  const [balance, setBalance] = useState<{ address: string; balance: BigNumber }>();

  useEffect(() => {
    if (!address || !utils.isAddress(address)) return;
    let active = true;
    new Contract(address, TOKEN_ABI, getReadProvider())
      .balanceOf(TREASURY_ADDRESS)
      .then((b: BigNumber) => active && setBalance({ address, balance: b }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [address]);

  return balance && balance.address === address ? balance.balance : undefined;
};
