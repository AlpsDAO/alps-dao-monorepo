import { useState } from "react";
import { CHAIN_ID, ChainId } from "../config";
import { ethers } from "ethers";
import { AbstractConnector } from '@web3-react/abstract-connector';
import { usePublicProvider } from "./usePublicProvider";

export interface Wallet {
    account?: string;
    chainId?: number;
    provider?: ethers.providers.BaseProvider;
    activate?: (connector: AbstractConnector) => void;
    deactivate?: () => void;
}

export const useWallet = (): Wallet => {
    const publicProvider = usePublicProvider();
    const [account, setAccount] = useState<string | undefined>(undefined);
    const [chainId, setChainId] = useState<ChainId | undefined>(CHAIN_ID);
    const [provider, setProvider] = useState<ethers.providers.BaseProvider>(publicProvider);

    const activate = async (connector: AbstractConnector) => {
        try {
            const result = await connector.activate();
            if (!result || !result.account || !result.provider) return;
            const { chainId: providerChainId } = await provider.getNetwork();
            const web3Provider = new ethers.providers.Web3Provider(result.provider);
            setProvider(web3Provider);
            setChainId(providerChainId);
            setAccount(result.account);
            result.provider.once('disconnect', deactivate);
        }
        catch { }
    };

    const deactivate = () => {
        setAccount(undefined);
        setChainId(CHAIN_ID);
        setProvider(publicProvider);
    };

    return { account, chainId, provider, activate, deactivate };
};
