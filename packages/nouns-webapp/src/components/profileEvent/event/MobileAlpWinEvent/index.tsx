import React from 'react';
import { buildEtherscanTxLink } from '../../../../utils/etherscan';
import { AlpWinEvent } from '../../../../wrappers/alpActivity';
import classes from './MobileAlpWinEvent.module.css';
import MobileAlpActivityRow from '../../activityRow/MobileAlpActivityRow';
import { CakeIcon } from '@heroicons/react/solid';
import ShortAddress from '../../../ShortAddress';
import TransactionHashPill from '../../eventData/infoPills/TransactionHashPill';
import { Trans } from '@lingui/macro';

interface MobileAlpWinEventProps {
  event: AlpWinEvent;
}

const MobileAlpWinEvent: React.FC<MobileAlpWinEventProps> = props => {
  const { event } = props;

  const isAlperAlp = parseInt(event.alpId as string) % 10 === 0;
  return (
    <MobileAlpActivityRow
      onClick={() => window.open(buildEtherscanTxLink(event.transactionHash), '_blank')}
      icon={
        <div className={classes.iconWrapper}>
          <CakeIcon className={classes.switchIcon} />
        </div>
      }
      primaryContent={
        <>
          {isAlperAlp ? (
            <Trans>
              <span className={classes.bold}> Alp {event.alpId} </span> sent to{' '}
              <span className={classes.bold}>
                {' '}
                <ShortAddress address={event.winner} />
              </span>{' '}
            </Trans>
          ) : (
            <Trans>
              <span className={classes.bold}> Alp {event.alpId} </span> won by{' '}
              <span className={classes.bold}>
                {' '}
                <ShortAddress address={event.winner} />
              </span>{' '}
            </Trans>
          )}
        </>
      }
      secondaryContent={
        <>
          <TransactionHashPill transactionHash={event.transactionHash} />
        </>
      }
    />
  );
};

export default MobileAlpWinEvent;
