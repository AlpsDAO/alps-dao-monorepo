import React from 'react';
import { Trans } from '@lingui/macro';
import { getAlp } from '../StandaloneAlp';
import BlockCountdown, { useBlockRemaining } from '../BlockCountdown';
import { NextAlpPreview as Preview } from '../../hooks/useNextAlpPreview';
import { alpBackgroundColor } from '../../utils/alpBgColors';
import classes from './NextAlpPreview.module.css';

/**
 * A small card, above the kick-off button, showing the Alp a kick-off would mint right now, with how long
 * the current block (and so this Alp) has left.
 */
const NextAlpPreview: React.FC<{ preview: Preview }> = ({ preview }) => {
  const remaining = useBlockRemaining(preview.since);
  const alpId = preview.alpId.toNumber();
  return (
    <div className={classes.card}>
      <img
        className={classes.art}
        src={getAlp(preview.alpId, preview.seed).image}
        style={{ backgroundColor: alpBackgroundColor(preview.seed) }}
        alt={`Alp ${alpId}, which kicking off the next auction would mint now`}
      />
      <div className={classes.text}>
        <span className={classes.title}>
          <Trans>Next up · Alp {alpId}</Trans>
        </span>
        <span className={classes.note}>
          <Trans>Changes with every block</Trans>
          <BlockCountdown remaining={remaining} />
        </span>
      </div>
    </div>
  );
};

export default NextAlpPreview;
