import React from 'react';
import { buildEtherscanTxLink } from '../../../../utils/etherscan';
import { DelegationEvent } from '../../../../wrappers/alpActivity';
import classes from './MobileDelegationEvent.module.css';
import MobileAlpActivityRow from '../../activityRow/MobileAlpActivityRow';
import { ScaleIcon } from '@heroicons/react/solid';
import ShortAddress from '../../../ShortAddress';
import TransactionHashPill from '../../eventData/infoPills/TransactionHashPill';
import { Trans } from '@lingui/macro';

interface MobileDelegationEventProps {
  event: DelegationEvent;
}

const MobileDelegationEvent: React.FC<MobileDelegationEventProps> = props => {
  const { event } = props;

  return (
    <MobileAlpActivityRow
      onClick={() => window.open(buildEtherscanTxLink(event.transactionHash), '_blank')}
      icon={
        <div className={classes.scaleIconWrapper}>
          <ScaleIcon className={classes.scaleIcon} />
        </div>
      }
      primaryContent={
        <Trans>
          Delegate changed from
          <span className={classes.bold}>
            {' '}
            <ShortAddress address={event.previousDelegate} />
          </span>{' '}
          to{' '}
          <span className={classes.bold}>
            <ShortAddress address={event.newDelegate} />
          </span>
        </Trans>
      }
      secondaryContent={
        <>
          <TransactionHashPill transactionHash={event.transactionHash} />
        </>
      }
    />
  );
};

export default MobileDelegationEvent;
