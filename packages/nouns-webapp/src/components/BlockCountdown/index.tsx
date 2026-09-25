import React, { useEffect, useState } from 'react';
import classes from './BlockCountdown.module.css';

// Ethereum makes a block every 12 seconds
const BLOCK_SECONDS = 12;

/** A draining bar for how long the current block (and so the previewed Alp) has left. */
const BlockCountdown: React.FC<{ remaining: number }> = ({ remaining }) => (
  <span className={classes.countdown}>
    <span className={classes.track}>
      <span className={classes.bar} style={{ width: `${(remaining / BLOCK_SECONDS) * 100}%` }} />
    </span>
    <span className={classes.seconds}>{Math.ceil(remaining)}s</span>
  </span>
);

/** Seconds left of the block that became current at `since` (Unix seconds), ticking 10 times a second. */
export const useBlockRemaining = (since: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return Math.min(BLOCK_SECONDS, Math.max(0, BLOCK_SECONDS - (now / 1000 - since)));
};

export default BlockCountdown;
