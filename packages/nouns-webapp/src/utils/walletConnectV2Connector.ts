import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import type WalletConnectProvider from '@walletconnect/ethereum-provider'
import { EthereumProviderOptions } from '@walletconnect/ethereum-provider/dist/types/EthereumProvider'
import { CHAIN_ID } from '../config'

export class WalletConnectV2Connector extends AbstractConnector {
  provider?: typeof WalletConnectProvider.prototype

  private readonly options: EthereumProviderOptions
  // Only resume a saved session: never show the QR code
  private readonly restoreOnly: boolean

  constructor(options: EthereumProviderOptions, restoreOnly = false) {
    super({ supportedChainIds: Object.keys(options.rpcMap || {}).map(k => Number(k)) })

    this.options = options
    this.restoreOnly = restoreOnly
  }

  static clearStorage = (storage: Storage) => {
    storage.removeRegExp(new RegExp('^wc@2:'))
  }

  activate = async (): Promise<ConnectorUpdate<string | number>> => {
    const provider = await import('@walletconnect/ethereum-provider').then(
      module => {
        return module.default.init({
          projectId: this.options.projectId,
          rpcMap: this.options.rpcMap || {},
          // Request everything as optional: a wallet rejects the whole session if it lacks any
          // *required* chain, method or event (e.g. Safe{Mobile} can't personal_sign).
          chains: [],
          optionalChains: [CHAIN_ID],
          showQrModal: true,
          // RPCs may not support the `test` method used for the ping.
          disableProviderPing: true,
          qrModalOptions: {
            themeVariables: {
              // Display the WC modal over other modals in the UI.
              // Won't be visible without this.
              '--wcm-z-index': '3000'
            }
          },
          // Methods and events based on what is used on nouns.wtf and the ethereum-provider lib found at:
          // https://github.com/WalletConnect/walletconnect-monorepo/blob/v2.0/providers/ethereum-provider/src/constants/rpc.ts
          methods: [],
          optionalMethods: [
            'eth_sendTransaction',
            'personal_sign',
            'eth_accounts',
            'eth_requestAccounts',
            'wallet_switchEthereumChain',
            'wallet_addEthereumChain'
          ],
          events: [],
          optionalEvents: ['chainChanged', 'accountsChanged', 'disconnect']
        })
      }
    )

    if (this.restoreOnly && !provider.session) {
      throw new Error('No WalletConnect session to restore')
    }

    const accounts = await provider.enable()

    provider.on('accountsChanged', this.handleAccountsChanged)
    provider.on('chainChanged', this.handleChainChanged)
    provider.on('disconnect', this.handleDisconnect)

    this.provider = provider

    return {
      chainId: provider.chainId,
      account: accounts[0],
      provider
    }
  }

  getProvider = async (): Promise<any> => {
    if (!this.provider) {
      throw new Error('Provider is undefined')
    }
    return this.provider
  }

  getChainId = async (): Promise<string | number> => {
    if (!this.provider) {
      throw new Error('Provider is undefined')
    }
    return this.provider.chainId
  }

  getAccount = async (): Promise<string | null> => {
    if (!this.provider) {
      throw new Error('Provider is undefined')
    }
    return this.provider.accounts[0]
  }

  getWalletName = (): string | undefined => {
    return this.provider?.session?.peer.metadata.name
  }

  deactivate = (): void => {
    if (!this.provider) {
      return
    }
    this.emitDeactivate()

    this.provider
      .removeListener('accountsChanged', this.handleAccountsChanged)
      .removeListener('chainChanged', this.handleChainChanged)
      .removeListener('disconnect', this.handleDisconnect)
      .disconnect()
  }

  handleAccountsChanged = (accounts: string[]): void => {
    this.emitUpdate({ account: accounts[0] })
  }

  handleChainChanged = (chainId: string | number): void => {
    this.emitUpdate({ chainId })
  }

  handleDisconnect = (): void => {
    if (!this.provider) {
      throw new Error('Provider is undefined')
    }
    this.deactivate()
  }
}