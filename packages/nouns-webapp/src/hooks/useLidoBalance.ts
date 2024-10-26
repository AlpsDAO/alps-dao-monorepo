import { useEffect, useState } from 'react';
import { BigNumber } from 'ethers';
import config from '../config';
import { useContracts } from './useContracts';

const { addresses } = config;

function useLidoBalance(): BigNumber | undefined {
  const [balance, setBalance] = useState(undefined);
  const { lidoToken } = useContracts();

  useEffect(() => {
    if (!lidoToken || !addresses.alpsDaoExecutor) return;
    lidoToken.balanceOf(addresses.alpsDaoExecutor).then(setBalance);
  }, [lidoToken]);

  return balance;
}

export default useLidoBalance;
