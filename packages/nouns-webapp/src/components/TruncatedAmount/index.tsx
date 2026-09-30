import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import React from 'react';

const TruncatedAmount: React.FC<{ amount: BigNumber }> = props => {
  const { amount } = props;

  // up to 4 decimal places, without trailing zeros: Ξ 0.08, not Ξ 0.0800
  const eth = new BigNumber(utils.formatEther(amount.toString())).decimalPlaces(4).toFormat();

  if (amount.toNumber() === 0) {
    return <>n/a</>;
  }
  return <>Ξ {`${eth}`}</>;
};
export default TruncatedAmount;
