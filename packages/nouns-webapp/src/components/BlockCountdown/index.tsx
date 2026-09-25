import React, { useEffect, useState } from 'react';
import classes from './BlockCountdown.module.css';

// Ethereum makes a block every 12 seconds
const BLOCK_SECONDS = 12;
const RADIUS = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A small timer ring and seconds for how long the current block (and so the previewed Alp) has left. */
const BlockCountdown: React.FC<{ remaining: number }> = ({ remaining }) => (
  <span className={classes.countdown} title="Time left in the current block">
    <svg className={classes.ring} viewBox="0 0 16 16" aria-hidden="true">
      <circle className={classes.track} cx="8" cy="8" r={RADIUS} />
      <circle
        className={classes.progress}
        cx="8"
        cy="8"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - remaining / BLOCK_SECONDS)}
      />
    </svg>
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
