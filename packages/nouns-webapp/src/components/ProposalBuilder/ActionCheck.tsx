import React, { useCallback, useState } from 'react';
import { Trans } from '@lingui/macro';
import { BeakerIcon } from '@heroicons/react/outline';
import { ProposalActionTx } from '../../utils/proposalActions/encoding';
import { SimulationResult, simulateAction } from '../../utils/proposalActions/simulate';
import { Cross, Tick } from './inputs/Field';
import classes from './ProposalBuilder.module.css';

type CheckState = SimulationResult | { status: 'checking' };

const keyOf = (tx: ProposalActionTx) =>
  [tx.target.toLowerCase(), tx.value, tx.signature, tx.calldata.toLowerCase()].join('|');

/** Simulation results by action; an edited action has a new key, so its old result drops away. */
export const useActionChecks = () => {
  const [results, setResults] = useState<Record<string, CheckState>>({});

  const check = useCallback(async (tx: ProposalActionTx) => {
    const key = keyOf(tx);
    setResults(r => ({ ...r, [key]: { status: 'checking' } }));
    const result = await simulateAction(tx);
    setResults(r => ({ ...r, [key]: result }));
  }, []);

  const checkAll = useCallback((txs: ProposalActionTx[]) => Promise.all(txs.map(check)), [check]);
  const resultFor = (tx: ProposalActionTx): CheckState | undefined => results[keyOf(tx)];

  return { check, checkAll, resultFor };
};

export const CheckButton: React.FC<{ state?: CheckState; onClick: () => void }> = ({
  state,
  onClick,
}) => (
  <button
    type="button"
    className={classes.iconButton}
    onClick={onClick}
    disabled={state?.status === 'checking'}
    title="Run this action as if the treasury sent it now"
  >
    <BeakerIcon />
    <Trans>Check</Trans>
  </button>
);

export const CheckResult: React.FC<{ state?: CheckState }> = ({ state }) => {
  if (!state) return null;
  let content: React.ReactNode;
  switch (state.status) {
    case 'checking':
      content = (
        <span className={classes.pending}>
          <Trans>Checking…</Trans>
        </span>
      );
      break;
    case 'ok':
      content = (
        <span className={classes.ok}>
          <Tick /> <Trans>Works if the treasury sent it right now.</Trans>
        </span>
      );
      break;
    case 'insufficient-eth':
      content = (
        <span className={classes.error}>
          <Cross /> <Trans>The treasury doesn't hold enough ETH for this right now.</Trans>
        </span>
      );
      break;
    case 'reverted': {
      const reason = state.reason;
      content = reason ? (
        <span className={classes.error}>
          <Cross /> <Trans>Would fail right now: {reason}</Trans>
        </span>
      ) : (
        <span className={classes.error}>
          <Cross /> <Trans>Would fail right now, without saying why.</Trans>
        </span>
      );
      break;
    }
    case 'unavailable':
      content = (
        <span className={classes.pending}>
          <Trans>Couldn't run the check. Try again in a moment.</Trans>
        </span>
      );
      break;
  }
  return <div className={classes.checkResult}>{content}</div>;
};
