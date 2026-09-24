import { ConnectorUpdate } from '@web3-react/types'
import { AbstractConnector } from '@web3-react/abstract-connector'
import SafeAppsSDK, { SafeInfo } from '@safe-global/safe-apps-sdk'
import { SafeAppProvider } from '@safe-global/safe-apps-provider'
import { CHAIN_ID } from '../config'

// Outside Safe{Wallet} the SDK never gets an answer, so give up after this long
const SAFE_INFO_TIMEOUT_MS = 1000

export const isInIframe = () => typeof window !== 'undefined' && window.parent !== window

let sdk: SafeAppsSDK | undefined
const getSdk = () => {
  // Only trust messages from the official Safe{Wallet} app that embeds us
  sdk = sdk ?? new SafeAppsSDK({ allowedDomains: [/^https:\/\/app\.safe\.global$/] })
  return sdk
}

/**
 * Connects to the Safe when alps.wtf runs as a Safe App inside Safe{Wallet}: the Safe is the
 * account, and transactions are proposed to the Safe's queue for its owners to confirm.
 */
export class SafeAppConnector extends AbstractConnector {
  private safe?: SafeInfo
  private provider?: SafeAppProvider

  constructor() {
    super({ supportedChainIds: [CHAIN_ID] })
  }

  static getSafeInfo = async (): Promise<SafeInfo | undefined> => {
    if (!isInIframe()) return undefined
    const timeout = new Promise<undefined>(resolve => setTimeout(resolve, SAFE_INFO_TIMEOUT_MS))
    return Promise.race([getSdk().safe.getInfo(), timeout])
  }

  activate = async (): Promise<ConnectorUpdate<string | number>> => {
    const safe = this.safe ?? (await SafeAppConnector.getSafeInfo())
    if (!safe) {
      throw new Error('Not running as a Safe App')
    }
    this.safe = safe
    this.provider = this.provider ?? new SafeAppProvider(safe, getSdk())

    return {
      chainId: safe.chainId,
      account: safe.safeAddress,
      provider: this.provider
    }
  }

  getProvider = async (): Promise<any> => {
    if (!this.provider) {
      throw new Error('Provider is undefined')
    }
    return this.provider
  }

  getChainId = async (): Promise<string | number> => {
    if (!this.safe) {
      throw new Error('Safe is undefined')
    }
    return this.safe.chainId
  }

  getAccount = async (): Promise<string | null> => {
    return this.safe?.safeAddress ?? null
  }

  deactivate = (): void => {
    this.emitDeactivate()
  }
}
