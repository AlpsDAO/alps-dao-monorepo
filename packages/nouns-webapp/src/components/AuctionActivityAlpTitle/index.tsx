import { BigNumber } from 'ethers';
import classes from './AuctionActivityAlpTitle.module.css';
import { Trans } from '@lingui/macro';

const AuctionActivityAlpTitle: React.FC<{ alpId: BigNumber; isCool?: boolean }> = props => {
  const { alpId, isCool } = props;
  return (
    <div className={classes.wrapper}>
      <h1 style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}>
        <Trans>Alp {alpId.toString()}</Trans>
      </h1>
    </div>
  );
};
export default AuctionActivityAlpTitle;
