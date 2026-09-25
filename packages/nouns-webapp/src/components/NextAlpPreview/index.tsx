import React from 'react';
import { Trans } from '@lingui/macro';
import Alp from '../Alp';
import { getAlp } from '../StandaloneAlp';
import BlockCountdown, { useBlockRemaining } from '../BlockCountdown';
import { NextAlpPreview as Preview } from '../../hooks/useNextAlpPreview';
import { alpBackgroundColor } from '../../utils/alpBgColors';

/**
 * The half of the art panel showing the Alp a kick-off would mint right now, on its own background colour,
 * with how long the current block (and so this Alp) has left.
 */
const NextAlpPreview: React.FC<{
  preview: Preview;
  className: string;
  labelClassName: string;
  artClassName: string;
}> = ({ preview, className, labelClassName, artClassName }) => {
  const remaining = useBlockRemaining(preview.since);
  const alpId = preview.alpId.toNumber();
  return (
    <div className={className} style={{ backgroundColor: alpBackgroundColor(preview.seed) }}>
      <span className={labelClassName}>
        <Trans>Next · Alp {alpId}</Trans>
        <BlockCountdown remaining={remaining} />
      </span>
      <div className={artClassName}>
        <Alp
          imgPath={getAlp(preview.alpId, preview.seed).image}
          alt={`Alp ${alpId}, which kicking off the next auction would mint now`}
        />
      </div>
    </div>
  );
};

export default NextAlpPreview;
