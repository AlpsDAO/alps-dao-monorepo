import { utils } from 'ethers';
import { CHAIN_ID, ChainId, ETHERSCAN_API_KEY } from '../../config';
import { buildEtherscanApiQuery } from '../etherscan';
import { getReadProvider, knownContract, knownContractAbi } from './contracts';

export type AbiSource = 'site' | 'etherscan' | 'sourcify' | 'pasted' | 'signature';

export interface AbiLookup {
  /** Every function in the ABI, as JSON fragments */
  functions: string[];
  source: AbiSource;
  contractName?: string;
  /** Set when the address is a proxy and the ABI is its implementation's */
  implementation?: string;
}

export type AbiLookupResult =
  | { status: 'found'; lookup: AbiLookup }
  | { status: 'not-contract' }
  | { status: 'not-verified' };

const functionsOf = (abi: ReadonlyArray<any> | utils.Interface): string[] => {
  const iface = abi instanceof utils.Interface ? abi : new utils.Interface(abi);
  return Object.values(iface.functions).map(f => f.format(utils.FormatTypes.json));
};

/** Implementation functions first, then any the proxy adds itself (e.g. upgrade functions). */
const mergeFunctions = (implementation: string[], proxy: string[]) => {
  const signatures = new Set(
    implementation.map(f => utils.FunctionFragment.from(JSON.parse(f)).format()),
  );
  return [
    ...implementation,
    ...proxy.filter(f => !signatures.has(utils.FunctionFragment.from(JSON.parse(f)).format())),
  ];
};

interface EtherscanSource {
  abi?: string;
  name?: string;
  implementation?: string;
}

const etherscanSource = async (address: string): Promise<EtherscanSource | undefined> => {
  const response = await fetch(buildEtherscanApiQuery(address, 'contract', 'getsourcecode'));
  const json = await response.json();
  const result = Array.isArray(json?.result) ? json.result[0] : undefined;
  // status "0" means an error (rate limit, bad key...), not "unverified"
  if (json?.status !== '1' || !result) throw new Error(String(json?.result ?? 'Etherscan error'));
  const verified = typeof result.ABI === 'string' && result.ABI.startsWith('[');
  return {
    abi: verified ? result.ABI : undefined,
    name: result.ContractName || undefined,
    implementation:
      result.Proxy === '1' && utils.isAddress(result.Implementation)
        ? utils.getAddress(result.Implementation)
        : undefined,
  };
};

const fromEtherscan = async (address: string): Promise<AbiLookup | undefined> => {
  const source = await etherscanSource(address);
  if (!source?.abi) return undefined;
  const own = functionsOf(JSON.parse(source.abi));
  if (source.implementation) {
    const impl = await etherscanSource(source.implementation).catch(() => undefined);
    if (impl?.abi) {
      return {
        functions: mergeFunctions(functionsOf(JSON.parse(impl.abi)), own),
        source: 'etherscan',
        contractName: impl.name ?? source.name,
        implementation: source.implementation,
      };
    }
  }
  return { functions: own, source: 'etherscan', contractName: source.name };
};

const sourcifyContract = async (address: string) => {
  const response = await fetch(
    `https://sourcify.dev/server/v2/contract/${CHAIN_ID}/${address}?fields=abi,proxyResolution`,
  );
  if (!response.ok) return undefined;
  return response.json();
};

const fromSourcify = async (address: string): Promise<AbiLookup | undefined> => {
  const contract = await sourcifyContract(address);
  if (!Array.isArray(contract?.abi)) return undefined;
  const own = functionsOf(contract.abi);
  const implementation = contract.proxyResolution?.implementations?.[0]?.address;
  if (contract.proxyResolution?.isProxy && utils.isAddress(implementation)) {
    const impl = await sourcifyContract(implementation).catch(() => undefined);
    if (Array.isArray(impl?.abi)) {
      return {
        functions: mergeFunctions(functionsOf(impl.abi), own),
        source: 'sourcify',
        implementation: utils.getAddress(implementation),
      };
    }
  }
  return { functions: own, source: 'sourcify' };
};

const cache: Record<string, Promise<AbiLookupResult>> = {};

const lookup = async (address: string): Promise<AbiLookupResult> => {
  const known = knownContract(address);
  if (known && known !== 'weth' && known !== 'usdc' && known !== 'steth') {
    return { status: 'found', lookup: { functions: functionsOf(knownContractAbi(known)), source: 'site' } };
  }

  const code = await getReadProvider()
    .getCode(address)
    .catch(() => undefined);
  // No code, or an EIP-7702 delegation: a regular account either way
  if (code === '0x' || code?.startsWith('0xef0100')) return { status: 'not-contract' };

  if (ETHERSCAN_API_KEY && CHAIN_ID !== ChainId.Hardhat) {
    const found = await fromEtherscan(address).catch(() => undefined);
    if (found) return { status: 'found', lookup: found };
  }
  const found = await fromSourcify(address).catch(() => undefined);
  if (found) return { status: 'found', lookup: found };

  // Last resort for well-known tokens when both explorers are unreachable
  if (known) {
    return {
      status: 'found',
      lookup: { functions: functionsOf(knownContractAbi(known)), source: 'site' },
    };
  }
  return { status: 'not-verified' };
};

/**
 * Finds a contract's ABI: bundled for the DAO's own contracts, otherwise Etherscan (following
 * proxies to their implementation), then Sourcify.
 */
export const lookupContractAbi = (address: string): Promise<AbiLookupResult> => {
  const key = address.toLowerCase();
  if (!cache[key]) {
    cache[key] = lookup(utils.getAddress(address));
    // Don't keep failures around: the explorers may just have been unreachable
    cache[key].then(
      result => result.status !== 'found' && delete cache[key],
      () => delete cache[key],
    );
  }
  return cache[key];
};

/** Parses ABI JSON pasted by hand: a plain array, or an object with an `abi` field (Hardhat, Foundry). */
export const parsePastedAbi = (text: string): string[] | undefined => {
  try {
    const parsed = JSON.parse(text);
    const abi = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.abi) ? parsed.abi : undefined;
    if (!abi) return undefined;
    const functions = functionsOf(abi);
    return functions.length ? functions : undefined;
  } catch {
    return undefined;
  }
};

export const isWriteFunction = (fragment: utils.FunctionFragment) =>
  !fragment.constant && fragment.stateMutability !== 'view' && fragment.stateMutability !== 'pure';
