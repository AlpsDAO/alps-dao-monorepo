import { useState } from "react";
import { CHAIN_ID, ChainId } from "../config";
import { ethers } from "ethers";
import { AbstractConnector } from '@web3-react/abstract-connector';
import { usePublicProvider } from "./usePublicProvider";

export const useWallet = () => {
    const publicProvider = usePublicProvider();
    const [account, setAccount] = useState<string | undefined>(undefined);
    const [chainId, setChainId] = useState<ChainId | undefined>(CHAIN_ID);
    const [provider, setProvider] = useState<ethers.providers.BaseProvider>(publicProvider);

    const activate = async (connector: AbstractConnector) => {
        try {
            const result = await connector.activate();
            if (!result || !result.account || !result.chainId || !result.provider) return;
            setAccount(result.account);
            const network = ethers.providers.getNetwork(result.chainId);
            setChainId(network.chainId);
            setProvider(result.provider);
            result.provider.once('disconnect', deactivate);
        }
        catch {}
    };

    const deactivate = () => {
        setAccount(undefined);
        setChainId(undefined);
        setProvider(publicProvider);
    };

    return { account, chainId, provider, activate, deactivate };
};
