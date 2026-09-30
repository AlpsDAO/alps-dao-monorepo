import { AlpsAuctionHouseABI, AlpsDAOABI, AlpsTokenABI } from '@nouns/sdk';
import { ethers, utils } from 'ethers';
import config, { CHAIN_ID, ChainId } from '../../config';

/** The timelock that holds the treasury and executes every proposal action. */
export const TREASURY_ADDRESS = config.addresses.alpsDaoExecutor;

export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** proposalMaxOperations on the governor */
export const MAX_PROPOSAL_ACTIONS = 10;

// Limits enforced by AlpsDAOLogicV1 and AlpsDAOExecutor (the deployed governor and timelock)
export const GOVERNOR_LIMITS = {
  votingDelay: { min: 1, max: 40_320 },
  votingPeriod: { min: 5_760, max: 80_640 },
  proposalThresholdBPS: { min: 1, max: 1_000 },
  quorumVotesBPS: { min: 200, max: 2_000 },
};
export const TIMELOCK_DELAY_LIMITS = { min: 2 * 24 * 60 * 60, max: 30 * 24 * 60 * 60 };
export const TIMELOCK_GRACE_PERIOD = 14 * 24 * 60 * 60;

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

/** Tokens the treasury holds or is likely to send, offered as one-click choices. */
export const knownTokens = (): TokenInfo[] => {
  const tokens: TokenInfo[] = [];
  if (CHAIN_ID === ChainId.Mainnet) {
    tokens.push({ address: WETH_ADDRESS, symbol: 'WETH', decimals: 18 });
    tokens.push({ address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 });
  }
  if (config.addresses.lidoToken) {
    tokens.push({ address: config.addresses.lidoToken, symbol: 'stETH', decimals: 18 });
  }
  return tokens;
};

export const knownToken = (address: string | undefined) =>
  knownTokens().find(t => sameAddress(t.address, address));

export type KnownContract =
  | 'treasury'
  | 'token'
  | 'auctionHouse'
  | 'governor'
  | 'weth'
  | 'usdc'
  | 'steth';

export const sameAddress = (a: string | undefined, b: string | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

export const knownContract = (address: string | undefined): KnownContract | undefined => {
  if (!address) return undefined;
  const { addresses } = config;
  if (sameAddress(address, addresses.alpsDaoExecutor)) return 'treasury';
  if (sameAddress(address, addresses.alpsToken)) return 'token';
  if (sameAddress(address, addresses.alpsAuctionHouseProxy)) return 'auctionHouse';
  if (sameAddress(address, addresses.alpsDAOProxy)) return 'governor';
  if (sameAddress(address, addresses.lidoToken)) return 'steth';
  if (CHAIN_ID === ChainId.Mainnet && sameAddress(address, WETH_ADDRESS)) return 'weth';
  if (CHAIN_ID === ChainId.Mainnet && sameAddress(address, USDC_ADDRESS)) return 'usdc';
  return undefined;
};

export const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export const WETH_ABI = [
  ...ERC20_ABI,
  'function deposit() payable',
  'function withdraw(uint256 amount)',
];

// Only what the timelock lets itself call; queue/execute/cancel belong to the governor
export const TIMELOCK_ABI = [
  'function setDelay(uint256 delay)',
  'function setPendingAdmin(address pendingAdmin)',
  'function acceptAdmin()',
  'function delay() view returns (uint256)',
];

// The governor proxy's own upgrade function, on top of the logic contract's ABI
const GOVERNOR_PROXY_ABI = ['function _setImplementation(address implementation)'];

/** ABIs bundled with the site for the DAO's own contracts and the tokens above. */
export const knownContractAbi = (kind: KnownContract): utils.Interface => {
  switch (kind) {
    case 'treasury':
      return new utils.Interface(TIMELOCK_ABI);
    case 'token':
      return new utils.Interface(AlpsTokenABI);
    case 'auctionHouse':
      return new utils.Interface(AlpsAuctionHouseABI);
    case 'governor':
      return new utils.Interface([...AlpsDAOABI, ...GOVERNOR_PROXY_ABI]);
    case 'weth':
      return new utils.Interface(WETH_ABI);
    default:
      return new utils.Interface(ERC20_ABI);
  }
};

let readProvider: ethers.providers.StaticJsonRpcProvider | undefined;

/**
 * A plain JSON-RPC provider for reads and simulations, independent of the connected wallet (whose
 * provider may be a Safe or WalletConnect bridge).
 */
export const getReadProvider = () => {
  if (!readProvider) {
    readProvider = new ethers.providers.StaticJsonRpcProvider(config.app.jsonRpcUri, CHAIN_ID);
  }
  return readProvider;
};
