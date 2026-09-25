import { useEffect, useRef, useState } from "react";
import { CHAIN_ID, ChainId } from "../config";
import { ethers } from "ethers";
import { AbstractConnector } from '@web3-react/abstract-connector';
import { usePublicProvider } from "./usePublicProvider";
import { useAppDispatch } from "../hooks";
import { setAlertModal } from "../state/slices/application";
import { isSafeAccount, withSafeTxLookups } from "../utils/safe";
import { isInIframe, SafeAppConnector } from "../utils/safeAppConnector";
import { createConnector, WalletType } from "../utils/walletConnectors";

export interface Wallet {
    account?: string;
    chainId?: number;
    provider?: ethers.providers.BaseProvider;
    // The account is a Safe: its transactions wait in the Safe queue for owner confirmations
    isSafe?: boolean;
    connect?: (type: WalletType) => void;
    deactivate?: () => void;
}

// The wallet last connected with, so it can be restored on the next page load
const LAST_WALLET_KEY = 'alps-last-wallet';

const rememberWallet = (type: WalletType | undefined) => {
    try {
        if (type) localStorage.setItem(LAST_WALLET_KEY, type);
        else localStorage.removeItem(LAST_WALLET_KEY);
    } catch { }
};

const lastWallet = (): WalletType | undefined => {
    try {
        return (localStorage.getItem(LAST_WALLET_KEY) as WalletType) ?? undefined;
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
                    message: 'Alps DAO is on Ethereum Mainnet. Switch your wallet (or Safe) to Ethereum Mainnet and connect again.',
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
            return true;
        }
        catch {
            return false;
        }
    };

    const connect = async (type: WalletType, restoreOnly = false) => {
        const connected = await activate(createConnector(type, restoreOnly));
        if (connected && type !== 'safe') rememberWallet(type);
        // A saved session that no longer exists: stop trying to restore it
        if (!connected && restoreOnly) rememberWallet(undefined);
    };

    const deactivate = () => {
        const connector = connectorRef.current;
        connectorRef.current = undefined;
        rememberWallet(undefined);
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
        const type = lastWallet();
        const ethereum = (window as any).ethereum;
        if (type === 'injected' && ethereum?.request) {
            // Only if the site is still authorized, so this never opens a wallet prompt
            ethereum
                .request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts?.length) connect('injected');
                })
                .catch(() => { });
        } else if (type === 'walletconnect') {
            connect('walletconnect', true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { account, chainId, provider, isSafe, connect, deactivate };
};
