import BigNumber from 'bignumber.js';
import classes from './CurrentBid.module.css';
import TruncatedAmount from '../TruncatedAmount';
import { Row, Col } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';

const CurrentBid: React.FC<{ currentBid: BigNumber; auctionEnded: boolean }> = props => {
  const { currentBid, auctionEnded } = props;
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  // An ended auction nobody bid on has no winning bid
  const noBids = auctionEnded && currentBid.isZero();
  const titleContent = noBids ? (
    <Trans>Bids</Trans>
  ) : auctionEnded ? (
    <Trans>Winning bid</Trans>
  ) : (
    <Trans>Current bid</Trans>
  );

  return (
    <Row className={clsx(classes.wrapper, classes.container, classes.section)}>
      <Col xs={5} lg={12} className={classes.leftCol}>
        <h4
          style={{
            color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
          }}
          className={classes.mobileText}
        >
          {titleContent}
        </h4>
      </Col>
      <Col xs="auto" lg={12}>
        <h2
          className={classes.currentBid}
          style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}
        >
          {noBids ? <Trans>None</Trans> : <TruncatedAmount amount={currentBid && currentBid} />}
        </h2>
      </Col>
    </Row>
  );
};

export default CurrentBid;
