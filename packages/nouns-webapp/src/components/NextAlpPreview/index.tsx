import React from 'react';
import { Trans } from '@lingui/macro';
import { getAlp } from '../StandaloneAlp';
import AlpTraitList from '../AlpTraitList';
import BlockCountdown, { useBlockRemaining } from '../BlockCountdown';
import { NextAlpPreview as Preview } from '../../hooks/useNextAlpPreview';
import { alpBackgroundColor } from '../../utils/alpBgColors';
import classes from './NextAlpPreview.module.css';

/**
 * A small card, above the kick-off button, showing the Alp a kick-off would mint right now with its
 * traits, and how long the current block (and so this Alp) has left.
 */
const NextAlpPreview: React.FC<{ preview: Preview }> = ({ preview }) => {
  const remaining = useBlockRemaining(preview.since);
  const alpId = preview.alpId.toNumber();
  const { image, parts } = getAlp(preview.alpId, preview.seed);
  const background = alpBackgroundColor(preview.seed);
  return (
    <div className={classes.card}>
      <img
        className={classes.art}
        src={image}
        style={{ backgroundColor: background }}
        alt={`Alp ${alpId}, which kicking off the next auction would mint now`}
      />
      <div className={classes.body}>
        <div className={classes.header}>
          <span className={classes.title}>
            <Trans>Next up · Alp {alpId}</Trans>
          </span>
          <BlockCountdown remaining={remaining} />
        </div>
        <AlpTraitList parts={parts} background={background} variant="compact" />
      </div>
    </div>
  );
};

export default NextAlpPreview;
