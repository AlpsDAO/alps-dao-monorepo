import { AbstractConnector } from '@web3-react/abstract-connector';
import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletLinkConnector } from '@web3-react/walletlink-connector';
import { TrezorConnector } from '@web3-react/trezor-connector';
import { FortmaticConnector } from '@web3-react/fortmatic-connector';
import config, { CHAIN_ID, WALLET_CONNECT_V2_PROJECT_ID } from '../config';
import { WalletConnectV2Connector } from './walletConnectV2Connector';
import { SafeAppConnector } from './safeAppConnector';

export type WalletType = 'injected' | 'walletconnect' | 'coinbase' | 'fortmatic' | 'trezor' | 'safe';

/**
 * @param restoreOnly reconnect an existing session only, never prompting the user (used on page load)
 */
export const createConnector = (type: WalletType, restoreOnly = false): AbstractConnector => {
  const supportedChainIds = [CHAIN_ID];
  switch (type) {
    case 'injected':
      return new InjectedConnector({ supportedChainIds });
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
    case 'coinbase':
      return new WalletLinkConnector({
        appName: 'Alps.WTF',
        appLogoUrl: 'https://alps.wtf/static/media/logo.cdea1650.svg',
        url: config.app.jsonRpcUri,
        supportedChainIds,
      });
    case 'fortmatic':
      return new FortmaticConnector({
        apiKey: 'pk_live_60FAF077265B4CBA',
        chainId: CHAIN_ID,
      });
    case 'trezor':
      return new TrezorConnector({
        chainId: CHAIN_ID,
        url: config.app.jsonRpcUri,
        manifestAppUrl: 'https://alps.wtf',
        manifestEmail: 'alpops+trezorconnect@protonmail.com',
      });
    case 'safe':
      return new SafeAppConnector();
  }
};
