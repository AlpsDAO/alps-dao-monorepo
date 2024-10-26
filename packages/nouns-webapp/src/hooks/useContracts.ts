import { AlpsAuctionHouseFactory, AlpsDaoLogicV1Factory, AlpsDAOV2ABI, AlpsTokenFactory } from "@nouns/sdk";
import { useWallet } from "./useWallet";
import config from "../config";
import { useMemo } from "react";
import { Contract, utils } from "ethers";
import ERC20 from '../libs/abi/ERC20.json';

export const useContracts = () => {
    const erc20Interface = useMemo(() => new utils.Interface(ERC20), []);
    const { provider } = useWallet();
    
    const alpsDaoToken = useMemo(() => AlpsTokenFactory.connect(config.addresses.alpsToken, provider), [provider]);
    const alpsDaoProxyV1 = useMemo(() => AlpsDaoLogicV1Factory.connect(config.addresses.alpsDAOProxy, provider), [provider]);
    const alpsDaoProxyV2 = useMemo(() => new Contract(config.addresses.alpsDAOProxy, AlpsDAOV2ABI, provider), [provider]);
    const alpsAuctionHouseProxy = useMemo(() => AlpsAuctionHouseFactory.connect(config.addresses.alpsAuctionHouse, provider), [provider]);
    
    const lidoToken = useMemo(() => {
        if (!config.addresses.lidoToken) return;
        return new Contract(config.addresses.lidoToken, erc20Interface, provider)
    }, [erc20Interface, provider]);

    return { alpsDaoToken, alpsDaoProxyV1, alpsDaoProxyV2, alpsAuctionHouseProxy, lidoToken };
};
