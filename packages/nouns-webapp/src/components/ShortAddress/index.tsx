import { useReverseENSLookUp } from '../../utils/ensLookup';
import { resolveAlpContractAddress } from '../../utils/resolveAlpsContractAddress';
import { useEthers } from '@usedapp/core';
import classes from './ShortAddress.module.css';
import { containsBlockedText } from '../../utils/moderation/containsBlockedText';
import { useShortAddress } from '../../utils/addressAndENSDisplayUtils';
import React from 'react';
import Identicon from '../Identicon';
import { useAppSelector } from '../../hooks';

const ShortAddress: React.FC<{ address: string; avatar?: boolean; size?: number }> = props => {
  const { address, avatar, size = 24 } = props;
  const { library: provider } = useEthers();

  const ens = useReverseENSLookUp(address) || resolveAlpContractAddress(address);
  const ensMatchesBlocklistRegex = containsBlockedText(ens || '', 'en');
  const shortAddress = useShortAddress(address);

  const isCool = useAppSelector(state => state.application.isCoolBackground);

  if (avatar) {
    return (
      <div className={classes.shortAddress}>
        {avatar && (
          <div key={address}>
            <Identicon size={size} address={address} provider={provider} />
          </div>
        )}
        <span
          className={classes.mobileText}
          style={{
            color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
          }}
        >
          {ens && !ensMatchesBlocklistRegex ? ens : shortAddress}
        </span>
      </div>
    );
  }

  return <>{ens && !ensMatchesBlocklistRegex ? ens : shortAddress}</>;
};

export default ShortAddress;
