import list from './flagged.json';

/** A wallet flagged for abuse (see flagged.json) */
export interface WalletFlag {
  address: string;
  /** completes "flagged for …" */
  reason: string;
}

const flags = new Map<string, WalletFlag>(list.wallets.map(w => [w.address.toLowerCase(), w]));

/** The flag on this wallet, if it has one */
export const walletFlag = (address?: string | null): WalletFlag | undefined =>
  address ? flags.get(address.toLowerCase()) : undefined;
