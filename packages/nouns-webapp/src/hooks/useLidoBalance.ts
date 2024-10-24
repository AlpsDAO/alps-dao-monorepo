import { useMemo, useEffect, useState } from 'react';
import { Contract } from '@ethersproject/contracts';
import { utils, BigNumber } from 'ethers';
import config, { getPublicProvider } from '../config';
import ERC20 from '../libs/abi/ERC20.json';

const { addresses } = config;

const erc20Interface = new utils.Interface(ERC20);

function useLidoBalance(): BigNumber | undefined {
  const [balance, setBalance] = useState(undefined);

  const lidoContract = useMemo((): Contract | undefined => {
    if (!addresses.lidoToken) return;
    const publicProvider = getPublicProvider();
    return new Contract(addresses.lidoToken, erc20Interface, publicProvider);
  }, []);

  useEffect(() => {
    if (!lidoContract || !addresses.alpsDaoExecutor) return;
    lidoContract.balanceOf(addresses.alpsDaoExecutor).then(setBalance);
  }, [lidoContract]);

  return balance;
}

export default useLidoBalance;
