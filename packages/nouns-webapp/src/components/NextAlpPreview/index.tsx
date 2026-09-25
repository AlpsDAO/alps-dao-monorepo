import React from 'react';
import { Trans } from '@lingui/macro';
import Alp from '../Alp';
import { getAlp } from '../StandaloneAlp';
import BlockCountdown, { useBlockRemaining } from '../BlockCountdown';
import { NextAlpPreview as Preview } from '../../hooks/useNextAlpPreview';
import classes from './NextAlpPreview.module.css';

/** The Alp a kick-off would mint right now, with how long the current block has left. */
const NextAlpPreview: React.FC<{ preview: Preview; labelClassName: string }> = ({ preview, labelClassName }) => {
  const remaining = useBlockRemaining(preview.since);
  const alpId = preview.alpId.toNumber();
  return (
    <>
      <span className={labelClassName}>
        <Trans>Up next: Alp {alpId}</Trans>
        <BlockCountdown remaining={remaining} />
      </span>
      <Alp
        imgPath={getAlp(preview.alpId, preview.seed).image}
        alt={`Alp ${alpId}, which kicking off the next auction would mint now`}
        className={classes.img}
      />
    </>
  );
};

export default NextAlpPreview;
