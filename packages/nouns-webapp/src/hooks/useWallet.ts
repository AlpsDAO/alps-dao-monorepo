import { useEffect, useRef, useState } from "react";
import { CHAIN_ID, ChainId } from "../config";
import { ethers } from "ethers";
import { AbstractConnector } from '@web3-react/abstract-connector';
import { usePublicProvider } from "./usePublicProvider";
import { useAppDispatch } from "../hooks";
import { setAlertModal } from "../state/slices/application";
import { isSafeAccount, withSafeTxLookups } from "../utils/safe";
import { isInIframe, SafeAppConnector } from "../utils/safeAppConnector";
import { ConnectOptions, createConnector, WalletType } from "../utils/walletConnectors";
import { findInjectedWallet } from "../utils/injectedWallets";

export interface Wallet {
    account?: string;
    chainId?: number;
    provider?: ethers.providers.BaseProvider;
    // The account is a Safe: its transactions wait in the Safe queue for owner confirmations
    isSafe?: boolean;
    connect?: (type: WalletType, options?: ConnectOptions) => void;
    deactivate?: () => void;
}

// The wallet last connected with ("injected:<wallet id>" or "walletconnect"), restored on the next page load
const LAST_WALLET_KEY = 'alps-last-wallet';

const rememberWallet = (wallet: string | undefined) => {
    try {
        if (wallet) localStorage.setItem(LAST_WALLET_KEY, wallet);
        else localStorage.removeItem(LAST_WALLET_KEY);
    } catch { }
};

const lastWallet = (): string | undefined => {
    try {
        return localStorage.getItem(LAST_WALLET_KEY) ?? undefined;
    } catch {
        return undefined;
    }
};

export const useWallet = (): Wallet => {
    const publicProvider = usePublicProvider();
    const dispatch = useAppDispatch();
    const [account, setAccount] = useState<string | undefined>(undefined);
    const [chainId, setChainId] = useState<ChainId | undefined>(CHAIN_ID);
    const [provider, setProvider] = useState<ethers.providers.BaseProvider>(publicProvider);
    const [isSafe, setIsSafe] = useState(false);
    const connectorRef = useRef<AbstractConnector>();

    const activate = async (connector: AbstractConnector): Promise<boolean> => {
        try {
            const result = await connector.activate();
            if (!result || !result.account || !result.provider) return false;
            // The injected connector doesn't report the chain on activate
            const connectedChainId = Number(result.chainId ?? await connector.getChainId());
            if (connectedChainId !== CHAIN_ID) {
                // Transactions would go to the wrong network's copy of the Alps contract addresses
                connector.deactivate();
                dispatch(setAlertModal({
                    show: true,
                    title: 'Wrong network',
                    message: 'Alps is on Ethereum Mainnet. Switch your wallet (or Safe) to Ethereum Mainnet and connect again.',
                }));
                return false;
            }
            const { chainId: providerChainId } = await provider.getNetwork();
            const isSafeWallet = connector instanceof SafeAppConnector || await isSafeAccount(publicProvider, result.account);
            // A Safe App provider already resolves safeTxHashes itself
            const eip1193 = isSafeWallet && !(connector instanceof SafeAppConnector)
                ? withSafeTxLookups(result.provider)
                : result.provider;
            const web3Provider = new ethers.providers.Web3Provider(eip1193);
            connectorRef.current = connector;
            setProvider(web3Provider);
            setChainId(providerChainId);
            setAccount(result.account);
            setIsSafe(isSafeWallet);
            // Not every injected provider is an EventEmitter
            result.provider.once?.('disconnect', deactivate);
            // Follow account and network switches made in the wallet
            connector.on('Web3ReactUpdate', ({ account: switched, chainId: switchedChain }) => {
                if (switchedChain !== undefined && Number(switchedChain) !== CHAIN_ID) {
                    deactivate();
                    return;
                }
                if (!switched) return;
                setAccount(switched);
                isSafeAccount(publicProvider, switched).then(setIsSafe);
            });
            connector.on('Web3ReactDeactivate', deactivate);
            return true;
        }
        catch {
            return false;
        }
    };

    const connect = async (type: WalletType, options: ConnectOptions = {}) => {
        let connected = false;
        try {
            connected = await activate(createConnector(type, options));
        } catch { }
        if (connected && type !== 'safe') {
            rememberWallet(type === 'injected' ? `injected:${options.walletId ?? ''}` : type);
        }
        // A saved session that no longer exists: stop trying to restore it
        if (!connected && options.restoreOnly) rememberWallet(undefined);
    };

    const deactivate = () => {
        const connector = connectorRef.current;
        connectorRef.current = undefined;
        rememberWallet(undefined);
        connector?.removeAllListeners();
        try {
            // Ends the WalletConnect session too, so it isn't restored on the next visit
            connector?.deactivate();
        } catch { }
        setAccount(undefined);
        setChainId(CHAIN_ID);
        setProvider(publicProvider);
        setIsSafe(false);
    };

    // Reconnect without prompting: inside Safe{Wallet} the Safe is the account; otherwise restore the
    // wallet used last time if it's still authorized
    useEffect(() => {
        if (isInIframe()) {
            connect('safe');
            return;
        }
        const last = lastWallet();
        if (last?.startsWith('injected')) {
            const walletId = last.split(':')[1] || undefined;
            // Only if the site is still authorized, so this never opens a wallet prompt
            findInjectedWallet(walletId)?.provider
                .request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts?.length) connect('injected', { walletId, restoreOnly: true });
                })
                .catch(() => { });
        } else if (last === 'walletconnect') {
            connect('walletconnect', { restoreOnly: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { account, chainId, provider, isSafe, connect, deactivate };
};
