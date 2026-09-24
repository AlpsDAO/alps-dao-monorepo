import { ethers } from 'ethers';
import { CHAIN_ID } from '../config';

// A Safe answers eth_sendTransaction with its own safeTxHash rather than an Ethereum tx hash: the
// transaction only reaches the chain once enough owners confirm it and one of them executes it.
// Safe's public Client Gateway maps the safeTxHash to its confirmations and, once executed, its tx hash.
const SAFE_CLIENT_GATEWAY = 'https://safe-client.safe.global';
const SAFE_APP_URL = 'https://app.safe.global';
const SAFE_CHAIN_PREFIX: Record<number, string> = { 1: 'eth', 5: 'gor' };

const POLL_INTERVAL_MS = 10000;
const MAX_WAIT_MS = 60 * 60 * 1000;

export interface SafeTxProgress {
  safeTxHash: string;
  confirmationsSubmitted: number;
  confirmationsRequired: number;
  url: string;
}

interface GatewayTx {
  safeAddress: string;
  txId: string;
  txStatus: 'AWAITING_CONFIRMATIONS' | 'AWAITING_EXECUTION' | 'CANCELLED' | 'FAILED' | 'SUCCESS';
  txHash?: string | null;
  detailedExecutionInfo?: { confirmationsRequired?: number; confirmations?: unknown[] };
}

const fetchSafeTx = async (safeTxHash: string): Promise<GatewayTx | undefined> => {
  const res = await fetch(`${SAFE_CLIENT_GATEWAY}/v1/chains/${CHAIN_ID}/transactions/${safeTxHash}`);
  if (!res.ok) return undefined;
  return res.json();
};

const safeTxUrl = ({ safeAddress, txId }: GatewayTx) =>
  `${SAFE_APP_URL}/transactions/tx?safe=${SAFE_CHAIN_PREFIX[CHAIN_ID] ?? 'eth'}:${safeAddress}&id=${txId}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * True if the address is a Safe (has a Safe's `getThreshold`), i.e. transactions it sends need owner
 * confirmations before they execute.
 */
export const isSafeAccount = async (
  provider: ethers.providers.Provider,
  address: string,
): Promise<boolean> => {
  try {
    const safe = new ethers.Contract(address, ['function getThreshold() view returns (uint256)'], provider);
    return (await safe.getThreshold()).gt(0);
  } catch {
    return false;
  }
};

/**
 * Waits for a Safe transaction to be executed on-chain and returns its tx hash, reporting confirmation
 * progress while it sits in the Safe queue. Returns undefined if it is still queued after an hour.
 */
export const waitForSafeExecution = async (
  hash: string,
  publicProvider: ethers.providers.Provider,
  onQueued: (progress: SafeTxProgress) => void,
): Promise<string | undefined> => {
  const deadline = Date.now() + MAX_WAIT_MS;
  let reported = '';
  while (Date.now() < deadline) {
    const tx = await fetchSafeTx(hash).catch(() => undefined);
    if (!tx) {
      // Safe web returns the real tx hash when the owner executes straight away
      if (await publicProvider.getTransaction(hash).catch(() => null)) return hash;
    } else if (tx.txStatus === 'SUCCESS' && tx.txHash) {
      return tx.txHash;
    } else if (tx.txStatus === 'FAILED') {
      // The Safe executed it, but the call itself reverted (e.g. already voted)
      throw new Error('The Safe executed this transaction, but the call reverted.');
    } else if (tx.txStatus === 'CANCELLED') {
      throw new Error('This transaction was replaced in your Safe and will not be executed.');
    } else {
      const progress = {
        safeTxHash: hash,
        confirmationsSubmitted: tx.detailedExecutionInfo?.confirmations?.length ?? 0,
        confirmationsRequired: tx.detailedExecutionInfo?.confirmationsRequired ?? 1,
        url: safeTxUrl(tx),
      };
      const key = `${tx.txStatus}:${progress.confirmationsSubmitted}`;
      if (key !== reported) {
        reported = key;
        onQueued(progress);
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return undefined;
};

interface Eip1193Provider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
}

/**
 * Wraps a WalletConnect provider connected to a Safe so ethers can resolve the safeTxHash it gets back
 * from eth_sendTransaction. Until execution, lookups return a pending placeholder (as Safe's own
 * SafeAppProvider does) instead of null, which would leave ethers polling for the transaction forever.
 */
export const withSafeTxLookups = (provider: Eip1193Provider): Eip1193Provider => {
  const proposed = new Map<string, object>();
  return {
    request: async ({ method, params = [] }) => {
      if (method === 'eth_sendTransaction') {
        const hash: string = await provider.request({ method, params });
        const { from, to, data = '0x', value = '0x0' } = params[0];
        proposed.set(hash, {
          hash, from, to, input: data, value, nonce: 0, gas: 0, gasPrice: '0x0',
          blockHash: null, blockNumber: null, transactionIndex: null,
        });
        return hash;
      }
      const isLookup = method === 'eth_getTransactionByHash' || method === 'eth_getTransactionReceipt';
      if (!isLookup || !proposed.has(params[0])) {
        return provider.request({ method, params });
      }
      const onChain = await provider.request({ method, params });
      if (onChain) return onChain;
      const executedTxHash = (await fetchSafeTx(params[0]).catch(() => undefined))?.txHash;
      if (executedTxHash) return provider.request({ method, params: [executedTxHash] });
      return method === 'eth_getTransactionByHash' ? proposed.get(params[0]) : null;
    },
  };
};
