import { useEffect, useState } from 'react';
import builtIn from './flagged.json';

/** A wallet flagged for abuse (see flagged.json) */
export interface WalletFlag {
  address: string;
  /** completes "flagged for …" */
  reason: string;
}

const toMap = (wallets: unknown): Map<string, WalletFlag> | undefined =>
  Array.isArray(wallets)
    ? new Map(
        wallets
          .filter((w): w is WalletFlag => typeof w?.address === 'string' && typeof w?.reason === 'string')
          .map(w => [w.address.toLowerCase(), w]),
      )
    : undefined;

// The copy built into the site, replaced by the live list once it loads. The live list is kept in
// Cloudflare KV and served at /flagged.json (functions/flagged.json.ts), so flagging needs no rebuild.
let flags = toMap(builtIn.wallets) ?? new Map<string, WalletFlag>();
let version = 0;
const listeners = new Set<() => void>();

// Not from the browser's cache: a phone browser bringing a tab back can reuse a copy days old
const loadLiveList = () =>
  fetch('/flagged.json', { cache: 'no-store' })
    .then(response => (response.ok ? response.json() : undefined))
    .then(list => {
      const live = toMap(list?.wallets);
      if (!live) return;
      flags = live;
      version++;
      listeners.forEach(listener => listener());
    })
    // The dev server has no /flagged.json: keep the built-in copy
    .catch(() => {});

if (typeof window !== 'undefined') {
  loadLiveList();
  // A tab left open would keep the list it opened with, so check again each time it comes back into view
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadLiveList();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) loadLiveList();
  });
}

const lookUp = (address?: string | null): WalletFlag | undefined =>
  address ? flags.get(address.toLowerCase()) : undefined;

/** Looks up the flag on a wallet, re-rendering when the live list arrives */
export const useWalletFlags = () => {
  const [, setSeen] = useState(version);
  useEffect(() => {
    const update = () => setSeen(version);
    listeners.add(update);
    // The live list may have arrived between this component's render and now
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return lookUp;
};
