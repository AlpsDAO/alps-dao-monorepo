import React from 'react';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';
import Alp from '../Alp';
import { getAlp } from '../StandaloneAlp';
import BlockCountdown, { useSlotRemaining } from '../BlockCountdown';
import { NextAlpPreview as Preview } from '../../hooks/useNextAlpPreview';
import classes from './NextAlpPreview.module.css';

/**
 * The Alp a kick-off would mint, with the time left to catch it. Once the slot is up the next block has
 * already been made (it just hasn't reached us yet), so this Alp is gone: fade it until the new one lands.
 */
const NextAlpPreview: React.FC<{ preview: Preview; labelClassName: string }> = ({ preview, labelClassName }) => {
  const remaining = useSlotRemaining(preview.blockTimestamp);
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
        className={clsx(classes.img, remaining <= 0 && classes.expired)}
      />
    </>
  );
};

export default NextAlpPreview;
