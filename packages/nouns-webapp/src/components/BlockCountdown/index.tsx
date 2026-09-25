import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';
import classes from './BlockCountdown.module.css';

// Ethereum makes a block every 12-second slot
const SLOT_SECONDS = 12;
// Inside this, a transaction sent now may miss the next block
const CUTTING_IT_CLOSE_SECONDS = 3;

/** A draining bar for the time left in the current block's 12-second slot. */
const BlockCountdown: React.FC<{ remaining: number }> = ({ remaining }) => (
  <span className={classes.countdown}>
    <span className={classes.track}>
      <span
        className={clsx(classes.bar, remaining <= CUTTING_IT_CLOSE_SECONDS && classes.closing)}
        style={{ width: `${(remaining / SLOT_SECONDS) * 100}%` }}
      />
    </span>
    <span className={classes.seconds}>
      {remaining > 0 ? <Trans>{Math.ceil(remaining)}s left</Trans> : <Trans>next block any moment</Trans>}
    </span>
  </span>
);

/** Seconds left in the slot that started at blockTimestamp, ticking 10 times a second. */
export const useSlotRemaining = (blockTimestamp: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, SLOT_SECONDS - Math.max(0, now / 1000 - blockTimestamp));
};

export default BlockCountdown;
