import { AbstractConnector } from '@web3-react/abstract-connector';
import config, { CHAIN_ID, WALLET_CONNECT_V2_PROJECT_ID } from '../config';
import { WalletConnectV2Connector } from './walletConnectV2Connector';
import { SafeAppConnector } from './safeAppConnector';
import { findInjectedWallet, InjectedWalletConnector } from './injectedWallets';

// Browser/in-app wallets are detected individually (EIP-6963); every other wallet, including mobile
// and hardware-backed ones like Rainbow, Zerion, Safe and Ledger Live, connects over WalletConnect
export type WalletType = 'injected' | 'walletconnect' | 'safe';

export interface ConnectOptions {
  // Which injected wallet, by its EIP-6963 id
  walletId?: string;
  // Reconnect an existing session only, never prompting the user (used on page load)
  restoreOnly?: boolean;
}

export const createConnector = (
  type: WalletType,
  { walletId, restoreOnly = false }: ConnectOptions = {},
): AbstractConnector => {
  switch (type) {
    case 'injected': {
      const wallet = findInjectedWallet(walletId);
      if (!wallet) throw new Error('No browser wallet found');
      return new InjectedWalletConnector(wallet.provider);
    }
    case 'walletconnect':
      return new WalletConnectV2Connector(
        {
          projectId: WALLET_CONNECT_V2_PROJECT_ID,
          showQrModal: true,
          optionalChains: [CHAIN_ID],
          rpcMap: {
            [CHAIN_ID]: config.app.jsonRpcUri,
          },
        },
        restoreOnly,
      );
    case 'safe':
      return new SafeAppConnector();
  }
};
