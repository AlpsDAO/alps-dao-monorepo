import { useEffect, useState } from "react";
import { CHAIN_ID, ChainId } from "../config";
import { ethers } from "ethers";
import { AbstractConnector } from '@web3-react/abstract-connector';
import { usePublicProvider } from "./usePublicProvider";
import { useAppDispatch } from "../hooks";
import { setAlertModal } from "../state/slices/application";
import { isSafeAccount, withSafeTxLookups } from "../utils/safe";
import { isInIframe, SafeAppConnector } from "../utils/safeAppConnector";

export interface Wallet {
    account?: string;
    chainId?: number;
    provider?: ethers.providers.BaseProvider;
    // The account is a Safe: its transactions wait in the Safe queue for owner confirmations
    isSafe?: boolean;
    activate?: (connector: AbstractConnector) => void;
    deactivate?: () => void;
}

export const useWallet = (): Wallet => {
    const publicProvider = usePublicProvider();
    const dispatch = useAppDispatch();
    const [account, setAccount] = useState<string | undefined>(undefined);
    const [chainId, setChainId] = useState<ChainId | undefined>(CHAIN_ID);
    const [provider, setProvider] = useState<ethers.providers.BaseProvider>(publicProvider);
    const [isSafe, setIsSafe] = useState(false);

    const activate = async (connector: AbstractConnector) => {
        try {
            const result = await connector.activate();
            if (!result || !result.account || !result.provider) return;
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
                return;
            }
            const { chainId: providerChainId } = await provider.getNetwork();
            const isSafeWallet = connector instanceof SafeAppConnector || await isSafeAccount(publicProvider, result.account);
            // A Safe App provider already resolves safeTxHashes itself
            const eip1193 = isSafeWallet && !(connector instanceof SafeAppConnector)
                ? withSafeTxLookups(result.provider)
                : result.provider;
            const web3Provider = new ethers.providers.Web3Provider(eip1193);
            setProvider(web3Provider);
            setChainId(providerChainId);
            setAccount(result.account);
            setIsSafe(isSafeWallet);
            result.provider.once('disconnect', deactivate);
        }
        catch { }
    };

    const deactivate = () => {
        setAccount(undefined);
        setChainId(CHAIN_ID);
        setProvider(publicProvider);
        setIsSafe(false);
    };

    // Opened as a Safe App inside Safe{Wallet}: the Safe is the account, so connect it straight away
    useEffect(() => {
        if (isInIframe()) activate(new SafeAppConnector());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { account, chainId, provider, isSafe, activate, deactivate };
};
