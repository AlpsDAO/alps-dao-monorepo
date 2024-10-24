import useLidoBalance from './useLidoBalance';
import useChainlinkEthToUsd from './useChainlinkEthToUsd';
import config, { getPublicProvider } from '../config';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

/**
 * Computes treasury balance (ETH + Lido)
 *
 * @returns Total balance of treasury (ETH + Lido) as EthersBN
 */
export const useTreasuryBalance = () => {
  const [ethBalance, setEthBalance] = useState<ethers.BigNumber | undefined>();
  const lidoBalanceAsETH = useLidoBalance();

  useEffect(() => {
    async function getTreasuryBalance() {
      const publicProvider = getPublicProvider();
      const balance = await publicProvider.getBalance(config.addresses.alpsDaoExecutor);
      setEthBalance(balance);
    }

    getTreasuryBalance();
  }, []);

  return ethBalance && lidoBalanceAsETH && ethBalance.add(lidoBalanceAsETH);
};

/**
 * Computes treasury usd value of treasury assets (ETH + Lido) at current ETH-USD exchange rate
 *
 * @returns USD value of treasury assets (ETH + Lido) at current exchange rate
 */
export const useTreasuryUSDValue = (ethBalance?: ethers.BigNumber) => {
  const [ balance, setBalance ] = useState<ethers.BigNumber | undefined>(undefined);
  const { rate, decimals } = useChainlinkEthToUsd();
  
  useEffect(() => {
    if (!rate || !decimals || !ethBalance) {
      setBalance(undefined);
      return;
    }
    setBalance(ethBalance.mul(rate.div(ethers.BigNumber.from(10).pow(decimals))));
  }, [rate?.toString(), decimals?.toString(), ethBalance?.toString()]);
  
  return balance;
};
