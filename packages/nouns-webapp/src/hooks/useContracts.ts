import { AlpsAuctionHouseFactory, AlpsDaoLogicV1Factory, AlpsDAOV2ABI, AlpsTokenFactory } from "@nouns/sdk";
import config from "../config";
import { useContext, useMemo } from "react";
import { Contract, ethers, utils } from "ethers";
import ERC20 from '../libs/abi/ERC20.json';
import { WalletContext } from "../contexts/WalletContext";

export const useContracts = () => {
    const erc20Interface = useMemo(() => new utils.Interface(ERC20), []);
    const { provider } = useContext(WalletContext);
    
    const signer = useMemo(() => provider instanceof ethers.providers.Web3Provider && provider.getSigner && provider.getSigner(), [provider]);

    const alpsDaoToken = useMemo(() => provider && AlpsTokenFactory.connect(config.addresses.alpsToken, signer ? signer : provider), [provider, signer]);
    const alpsDaoProxyV1 = useMemo(() => provider && AlpsDaoLogicV1Factory.connect(config.addresses.alpsDAOProxy, signer ? signer : provider), [provider, signer]);
    const alpsDaoProxyV2 = useMemo(() => provider && new Contract(config.addresses.alpsDAOProxy, AlpsDAOV2ABI, signer ? signer : provider), [provider, signer]);
    const alpsAuctionHouseProxy = useMemo(() => provider && AlpsAuctionHouseFactory.connect(config.addresses.alpsAuctionHouseProxy, signer ? signer : provider), [provider, signer]);
    
    const lidoToken = useMemo(() => {
        if (!config.addresses.lidoToken || !provider) return;
        return new Contract(config.addresses.lidoToken, erc20Interface, signer ? signer : provider)
    }, [erc20Interface, provider, signer]);

    return { alpsDaoToken, alpsDaoProxyV1, alpsDaoProxyV2, alpsAuctionHouseProxy, lidoToken };
};
