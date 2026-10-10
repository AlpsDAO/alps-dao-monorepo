import { useEffect, useState } from 'react';
import { BigNumber } from 'ethers';
import config from '../config';
import { useContracts } from './useContracts';
import { useRefreshCount } from './useRefreshCount';

const { addresses } = config;

function useLidoBalance(): BigNumber | undefined {
  const [balance, setBalance] = useState(undefined);
  const { lidoToken } = useContracts();
  const refreshCount = useRefreshCount();

  useEffect(() => {
    if (!lidoToken || !addresses.alpsDaoExecutor) return;
    lidoToken.balanceOf(addresses.alpsDaoExecutor).then(setBalance).catch(() => {});
  }, [lidoToken, refreshCount]);

  return balance;
}

export default useLidoBalance;
