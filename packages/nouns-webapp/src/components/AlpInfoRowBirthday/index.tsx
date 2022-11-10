import { BigNumber } from '@ethersproject/bignumber';
import React from 'react';
import { isAlperAlp } from '../../utils/alperAlp';

import classes from './AlpInfoRowBirthday.module.css';
import _BirthdayIcon from '../../assets/icons/Birthday.svg';

import { Image } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';
import { AuctionState } from '../../state/slices/auction';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';

interface AlpInfoRowBirthdayProps {
  alpId: number;
}

export const getAlpBirthday = (alpId: number, pastAuctions: AuctionState[]) => {
  return BigNumber.from(
    pastAuctions.find((auction: AuctionState, i: number) => {
      const maybeAlpId = auction.activeAuction?.alpId;
      return maybeAlpId ? BigNumber.from(maybeAlpId).eq(BigNumber.from(alpId)) : false;
    })?.activeAuction?.startTime || 0,
  );
};

const AlpInfoRowBirthday: React.FC<AlpInfoRowBirthdayProps> = props => {
  const { alpId } = props;
  const isCool = useAppSelector(state => state.application.isCoolBackground);

  // If the alp is a alper alp, use the next alp to get the mint date.
  // We do this because we use the auction start time to get the mint date and
  // alper alps do not have an auction start time.
  const alpIdForQuery = isAlperAlp(BigNumber.from(alpId)) ? alpId + 1 : alpId;

  const pastAuctions = useAppSelector(state => state.pastAuctions.pastAuctions);
  if (!pastAuctions || !pastAuctions.length) {
    return <></>;
  }

  const startTime = getAlpBirthday(alpIdForQuery, pastAuctions);
  if (!startTime) {
    return <Trans>Error fetching Alp birthday</Trans>;
  }

  const birthday = new Date(Number(startTime._hex) * 1000);

  return (
    <div className={classes.birthdayInfoContainer}>
      <span style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}>
        <span>
          <Image src={_BirthdayIcon} className={classes.birthdayIcon} />
        </span>
        <Trans>Born</Trans>
        <span className={classes.alpInfoRowBirthday}>
          {i18n.date(birthday, { month: 'long', year: 'numeric', day: '2-digit' })}
        </span>
      </span>
    </div>
  );
};

export default AlpInfoRowBirthday;
