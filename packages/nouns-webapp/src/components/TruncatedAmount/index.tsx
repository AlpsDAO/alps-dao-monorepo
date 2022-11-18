import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import React from 'react';

const TruncatedAmount: React.FC<{ amount: BigNumber }> = props => {
  const { amount } = props;

  const eth = new BigNumber(utils.formatEther(amount.toString())).toFixed(4);

  if (amount.toNumber() === 0) {
    return <>n/a</>;
  }
  return <>Ξ {`${eth}`}</>;
};
export default TruncatedAmount;
