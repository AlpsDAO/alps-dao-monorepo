import { useEffect, useState } from 'react';
import { ConnectorUpdate } from '@web3-react/types';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { CHAIN_ID } from '../config';

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  [flag: string]: any;
}

export interface InjectedWallet {
  // Reverse-DNS id announced by the wallet (e.g. me.rainbow), or 'injected' for a legacy window.ethereum
  id: string;
  name: string;
  // Data URI announced by the wallet; absent for legacy providers
  icon?: string;
  provider: Eip1193Provider;
}

// EIP-6963: every installed wallet (browser extension or wallet in-app browser) announces itself with its
// own name, icon and provider, instead of all of them fighting over window.ethereum
const announced = new Map<string, InjectedWallet>();
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event: Event) => {
    const { info, provider } = (event as CustomEvent).detail ?? {};
    if (!info?.rdns || !provider?.request) return;
    announced.set(info.rdns, { id: info.rdns, name: info.name, icon: info.icon, provider });
    listeners.forEach(listener => listener());
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

// Wallets that predate EIP-6963 only set window.ethereum, and flag who they are
const legacyWalletName = (ethereum: Eip1193Provider) => {
  if (ethereum.isRainbow) return 'Rainbow';
  if (ethereum.isZerion) return 'Zerion';
  if (ethereum.isRabby) return 'Rabby';
  if (ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
  if (ethereum.isBraveWallet) return 'Brave Wallet';
  if (ethereum.isTrust || ethereum.isTrustWallet) return 'Trust Wallet';
  if (ethereum.isOkxWallet) return 'OKX Wallet';
  if (ethereum.isMetaMask) return 'MetaMask';
  return 'Browser wallet';
};

export const getInjectedWallets = (): InjectedWallet[] => {
  if (announced.size) return Array.from(announced.values());
  const ethereum: Eip1193Provider | undefined = (window as any).ethereum;
  return ethereum?.request ? [{ id: 'injected', name: legacyWalletName(ethereum), provider: ethereum }] : [];
};

export const findInjectedWallet = (id: string | undefined) =>
  getInjectedWallets().find(wallet => wallet.id === id) ?? getInjectedWallets()[0];

/** The wallets installed in this browser, updating as late ones announce themselves. */
export const useInjectedWallets = () => {
  const [wallets, setWallets] = useState(getInjectedWallets);
  useEffect(() => {
    const update = () => setWallets(getInjectedWallets());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return wallets;
};

/**
 * Connects to one specific injected wallet through the standard EIP-1193 interface.
 */
export class InjectedWalletConnector extends AbstractConnector {
  private readonly ethereum: Eip1193Provider;

  constructor(ethereum: Eip1193Provider) {
    super({ supportedChainIds: [CHAIN_ID] });
    this.ethereum = ethereum;
  }

  activate = async (): Promise<ConnectorUpdate<string | number>> => {
    const accounts: string[] = await this.ethereum.request({ method: 'eth_requestAccounts' });
    const chainId: string = await this.ethereum.request({ method: 'eth_chainId' });
    this.ethereum.on?.('accountsChanged', this.handleAccountsChanged);
    this.ethereum.on?.('chainChanged', this.handleChainChanged);
    return { provider: this.ethereum, account: accounts[0], chainId };
  };

  getProvider = async (): Promise<any> => this.ethereum;

  getChainId = async (): Promise<string | number> => this.ethereum.request({ method: 'eth_chainId' });

  getAccount = async (): Promise<string | null> =>
    (await this.ethereum.request({ method: 'eth_accounts' }))[0] ?? null;

  deactivate = (): void => {
    this.ethereum.removeListener?.('accountsChanged', this.handleAccountsChanged);
    this.ethereum.removeListener?.('chainChanged', this.handleChainChanged);
  };

  private handleAccountsChanged = (accounts: string[]): void => {
    if (accounts.length) this.emitUpdate({ account: accounts[0] });
    else this.emitDeactivate();
  };

  private handleChainChanged = (chainId: string | number): void => {
    this.emitUpdate({ chainId });
  };
}
