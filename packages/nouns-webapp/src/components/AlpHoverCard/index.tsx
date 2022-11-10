import { useQuery } from '@apollo/client';
import { BigNumber } from '@ethersproject/bignumber';
import { Trans } from '@lingui/macro';
import React from 'react';
import { Spinner } from 'react-bootstrap';
import { alpQuery } from '../../wrappers/subgraph';
import ShortAddress from '../ShortAddress';
import { StandaloneAlpCircular } from '../StandaloneAlp';
import classes from './AlpHoverCard.module.css';
import { HeartIcon, CakeIcon } from '@heroicons/react/solid';
import { isAlperAlp } from '../../utils/alperAlp';
import { useAppSelector } from '../../hooks';
import { i18n } from '@lingui/core';
import { getAlpBirthday } from '../AlpInfoRowBirthday';
import clsx from 'clsx';

interface AlpHoverCardProps {
  alpId: string;
}

const AlpHoverCard: React.FC<AlpHoverCardProps> = props => {
  const { alpId } = props;

  const { loading, error, data } = useQuery(alpQuery(alpId), {
    skip: alpId === null,
  });

  const pastAuctions = useAppSelector(state => state.pastAuctions.pastAuctions);
  if (!pastAuctions || !pastAuctions.length) {
    return <></>;
  }

  if (loading || !data || !alpId) {
    return (
      <div className={classes.spinnerWrapper}>
        <div className={classes.spinner}>
          <Spinner animation="border" />
        </div>
      </div>
    );
  }
  const numericAlpId = parseInt(alpId);
  const alpIdForQuery = isAlperAlp(BigNumber.from(alpId)) ? numericAlpId + 1 : numericAlpId;
  const startTime = getAlpBirthday(alpIdForQuery, pastAuctions);

  if (error || !startTime) {
    return <>Failed to fetch</>;
  }
  const birthday = new Date(Number(startTime._hex) * 1000);

  return (
    <div className={classes.wrapper}>
      {/* First Row */}
      <div className={classes.titleWrapper}>
        <div className={classes.alpWrapper}>
          <StandaloneAlpCircular alpId={BigNumber.from(alpId)} />
        </div>
        <div>
          <h1>Alp {alpId}</h1>
        </div>
      </div>

      {/* Alp birthday */}
      <div className={classes.alpInfoWrapper}>
        <CakeIcon height={20} width={20} className={classes.icon} />
        <Trans>Born</Trans> <span className={classes.bold}>{i18n.date(birthday)}</span>
      </div>

      {/* Current holder */}
      <div className={clsx(classes.alpInfoWrapper, classes.currentHolder)}>
        <HeartIcon height={20} width={20} className={classes.icon} />
        <span>
          <Trans>Held by</Trans>
        </span>
        <span className={classes.bold}>
          <ShortAddress address={data.alp.owner.id} />
        </span>
      </div>
    </div>
  );
};

export default AlpHoverCard;
