import React, { ReactNode } from 'react';
import { CheckIcon, ExclamationIcon, XIcon } from '@heroicons/react/solid';
import classes from '../ProposalBuilder.module.css';

/** A labelled form field with the current on-chain value, a hint, and any problem with the input. */
const Field: React.FC<{
  label: ReactNode;
  htmlFor?: string;
  current?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}> = ({ label, htmlFor, current, hint, error, children }) => (
  <div className={classes.field}>
    <div className={classes.labelRow}>
      <label className={classes.label} htmlFor={htmlFor}>
        {label}
      </label>
      {current && <span className={classes.current}>{current}</span>}
    </div>
    {children}
    {error && <div className={classes.error}>{error}</div>}
    {hint && <div className={classes.hint}>{hint}</div>}
  </div>
);

export const Warning: React.FC = ({ children }) => (
  <div className={classes.warning} role="status">
    <ExclamationIcon />
    <span>{children}</span>
  </div>
);

export const Warnings: React.FC<{ warnings?: ReactNode[] }> = ({ warnings }) => (
  <>
    {warnings?.map((w, i) => (
      <Warning key={i}>{w}</Warning>
    ))}
  </>
);

/** Inline marks for results: fonts draw ✓ inconsistently */
export const Tick: React.FC = () => <CheckIcon className={classes.statusIcon} aria-hidden />;
export const Cross: React.FC = () => <XIcon className={classes.statusIcon} aria-hidden />;

export default Field;
