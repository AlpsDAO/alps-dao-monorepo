import { useQuery } from '@apollo/client';
import { Trans } from '@lingui/macro';
import React from 'react';
import { Spinner } from 'react-bootstrap';
import { currentlyDelegatedAlps } from '../../wrappers/subgraph';
import HorizontalStackedAlps from '../HorizontalStackedAlps';
import ShortAddress from '../ShortAddress';
import classes from './ByLineHoverCard.module.css';
import { ScaleIcon } from '@heroicons/react/solid';

interface ByLineHoverCardProps {
  proposerAddress: string;
}

const MAX_NOUN_IDS_SHOWN = 12;

const ByLineHoverCard: React.FC<ByLineHoverCardProps> = props => {
  const { proposerAddress } = props;

  const { data, loading, error } = useQuery(currentlyDelegatedAlps(proposerAddress));

  if (loading || (data && data.delegates.length === 0)) {
    return (
      <div className={classes.spinnerWrapper}>
        <div className={classes.spinner}>
          <Spinner animation="border" />
        </div>
      </div>
    );
  }
  if (error) {
    return <>Error fetching Vote info</>;
  }

  const sortedAlpIds = data.delegates[0].alpsRepresented
    .map((alp: { id: string }) => {
      return parseInt(alp.id);
    })
    .sort((a: number, b: number) => {
      return a - b;
    });

  return (
    <div className={classes.wrapper}>
      <div className={classes.stackedAlpWrapper}>
        <HorizontalStackedAlps
          alpIds={data.delegates[0].alpsRepresented.map((alp: { id: string }) => alp.id)}
        />
      </div>

      <div className={classes.address}>
        <ShortAddress address={data ? data.delegates[0].id : ''} />
      </div>

      <div className={classes.alpsRepresented}>
        <div>
          <ScaleIcon height={15} width={15} className={classes.icon} />
          {sortedAlpIds.length === 1 ? (
            <Trans>
              <span>Delegated Alp: </span>
            </Trans>
          ) : (
            <Trans>
              <span>Delegated Alps: </span>
            </Trans>
          )}

          {sortedAlpIds.slice(0, MAX_NOUN_IDS_SHOWN).map((alpId: number, i: number) => {
            return (
              <span className={classes.bold} key={alpId.toString()}>
                {alpId}
                {i !== Math.min(MAX_NOUN_IDS_SHOWN, sortedAlpIds.length) - 1 && ', '}{' '}
              </span>
            );
          })}
          {sortedAlpIds.length > MAX_NOUN_IDS_SHOWN && (
            <span>
              <Trans>... and {sortedAlpIds.length - MAX_NOUN_IDS_SHOWN} more</Trans>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ByLineHoverCard;
