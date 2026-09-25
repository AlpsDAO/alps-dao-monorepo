import { Trans } from '@lingui/macro';
import React, { useContext } from 'react';
import { useShortAddress } from '../../utils/addressAndENSDisplayUtils';
import { useUserDelegatee } from '../../wrappers/alpToken';
import NavBarButton, { NavBarButtonStyle } from '../NavBarButton';
import ShortAddress from '../ShortAddress';
import classes from './CurrentDelegatePannel.module.css';
import { WalletContext } from '../../contexts/WalletContext';

interface CurrentDelegatePannelProps {
  onPrimaryBtnClick: (e: any) => void;
  onSecondaryBtnClick: (e: any) => void;
}

const CurrentDelegatePannel: React.FC<CurrentDelegatePannelProps> = props => {
  const { onPrimaryBtnClick, onSecondaryBtnClick } = props;

  const { account: maybeAccount } = useContext(WalletContext);
  const delegate = useUserDelegatee();
  const account = delegate ?? maybeAccount ?? '';
  const shortAccount = useShortAddress(account);

  return (
    <div className={classes.wrapper}>
      <div>
        <div className={classes.header}>
          <h1 className={classes.title}>
            <Trans>Delegation</Trans>
          </h1>

          <p className={classes.copy}>
            <Trans>
              Your Alps’ votes stay with your Alps, but they’re{' '}
              <span className={classes.emph}>delegatable</span>: someone else can vote with them
              while you keep your Alps.
            </Trans>
          </p>
        </div>

        <div className={classes.contentWrapper}>
          <div className={classes.current}>
            <Trans>Current Delegate</Trans>
          </div>
          <div className={classes.delegateInfoWrapper}>
            <div className={classes.ens}>
              <ShortAddress address={account} avatar={true} size={39} />
            </div>
            <div className={classes.shortAddress}>{shortAccount}</div>
          </div>
        </div>
      </div>

      <div className={classes.buttonWrapper}>
        <NavBarButton
          buttonText={<Trans>Close</Trans>}
          buttonStyle={NavBarButtonStyle.DELEGATE_BACK}
          onClick={onSecondaryBtnClick}
        />
        <NavBarButton
          buttonText={<Trans>Update Delegate</Trans>}
          buttonStyle={NavBarButtonStyle.DELEGATE_PRIMARY}
          onClick={onPrimaryBtnClick}
        />
      </div>
    </div>
  );
};

export default CurrentDelegatePannel;
