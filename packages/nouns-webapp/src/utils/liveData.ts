import { getReadProvider } from './proposalActions/contracts';

/**
 * Keeps what's on screen current, shared by every component so a page makes one request where it would
 * otherwise make one per component:
 * - the latest block, read every 12 seconds while something on screen uses it and the tab is in view, so
 *   whatever is worked out from it (a proposal opening for votes, closing, a countdown) moves on by itself;
 * - a refresh count, which goes up when one of the viewer's transactions confirms (and a few times after,
 *   as the subgraph catches up) and when the tab comes back after a while. Reads that only change through
 *   a transaction (vote receipts, balances, delegates) read again when it does, and the subgraph queries
 *   on screen are fetched again.
 */

type Listener = () => void;

export interface LatestBlock {
  number: number;
  // Seconds
  timestamp: number;
}

const BLOCK_MS = 12_000;
// The subgraph indexes a few seconds to a minute behind the chain
const AFTER_TRANSACTION_MS = [0, 5_000, 15_000, 45_000];
// Back in a tab sooner than this, there's likely nothing new
const AWAY_MS = 30_000;

let latestBlock: LatestBlock | undefined;
let lastReadAt = 0;
let reading = false;
let blockTimer: ReturnType<typeof setInterval> | undefined;
const blockListeners = new Set<Listener>();

let refreshCount = 0;
const refreshListeners = new Set<Listener>();

const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

const readLatestBlock = () => {
  if (reading) return;
  reading = true;
  lastReadAt = Date.now();
  getReadProvider()
    .getBlock('latest')
    .then(block => {
      if (!block || (latestBlock && block.number <= latestBlock.number)) return;
      latestBlock = { number: block.number, timestamp: block.timestamp };
      blockListeners.forEach(listener => listener());
    })
    .catch(() => {})
    .finally(() => {
      reading = false;
    });
};

// Polls only while something on screen uses the block and the tab is in view
const updateBlockTimer = () => {
  const wanted = blockListeners.size > 0 && isVisible();
  if (wanted && !blockTimer) {
    if (Date.now() - lastReadAt >= BLOCK_MS) readLatestBlock();
    blockTimer = setInterval(readLatestBlock, BLOCK_MS);
  } else if (!wanted && blockTimer) {
    clearInterval(blockTimer);
    blockTimer = undefined;
  }
};

const refresh = () => {
  refreshCount++;
  refreshListeners.forEach(listener => listener());
};

/** One of the viewer's transactions confirmed: read everything it may have changed. */
export const refreshAfterTransaction = () => {
  readLatestBlock();
  AFTER_TRANSACTION_MS.forEach(ms => setTimeout(refresh, ms));
};

export const getLatestBlock = () => latestBlock;

export const subscribeToBlocks = (listener: Listener) => {
  blockListeners.add(listener);
  updateBlockTimer();
  return () => {
    blockListeners.delete(listener);
    updateBlockTimer();
  };
};

export const getRefreshCount = () => refreshCount;

export const subscribeToRefresh = (listener: Listener) => {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
};

if (typeof document !== 'undefined') {
  let hiddenAt: number | undefined;
  document.addEventListener('visibilitychange', () => {
    if (!isVisible()) {
      hiddenAt = Date.now();
    } else {
      if (hiddenAt !== undefined && Date.now() - hiddenAt >= AWAY_MS) refresh();
      hiddenAt = undefined;
    }
    updateBlockTimer();
  });
  // A page restored from the back/forward cache comes back as it was left
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    refresh();
    readLatestBlock();
  });
}
