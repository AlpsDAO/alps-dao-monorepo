import React, { useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { Trans } from '@lingui/macro';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';
import { Proposal, ProposalState } from '../../wrappers/alpsDao';
import WalletConnectModal from '../WalletConnectModal';
import classes from './ProposalActions.module.css';

dayjs.extend(relativeTime);

// The timelock accepts a queued proposal for 14 days after it becomes executable
const GRACE_PERIOD_DAYS = 14;
const STOPPABLE = [ProposalState.PENDING, ProposalState.ACTIVE, ProposalState.SUCCEEDED, ProposalState.QUEUED];

/** Ticks once a second while the proposal is waiting out its timelock, so the countdown stays live. */
const useNow = (enabled: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return now;
};

const countdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
};

/**
 * What can be done with a proposal once it's out of voting: queue it, execute it (with a countdown until
 * the timelock allows it), cancel it (its proposer) or veto it (the vetoer). Without a wallet, each
 * button asks to connect one instead.
 */
const ProposalActions: React.FC<{
  proposal: Proposal;
  account: string | undefined;
  vetoer: string | undefined;
  pending: { queue: boolean; execute: boolean; cancel: boolean; veto: boolean };
  onQueue: () => void;
  onExecute: () => void;
  onCancel: () => void;
  onVeto: () => void;
}> = ({ proposal, account, vetoer, pending, onQueue, onExecute, onCancel, onVeto }) => {
  const [showConnect, setShowConnect] = useState(false);
  const isQueued = proposal.status === ProposalState.QUEUED;
  const now = useNow(isQueued);
  const eta = proposal.eta?.getTime();
  const isExecutable = isQueued && eta !== undefined && now >= eta;
  const expires = eta !== undefined ? dayjs(eta).add(GRACE_PERIOD_DAYS, 'day') : undefined;

  const me = account?.toLowerCase();
  const isProposer = !!me && me === proposal.proposer?.toLowerCase();
  const isVetoer = !!me && me === vetoer;
  const canStop = STOPPABLE.includes(proposal.status);
  const busy = pending.queue || pending.execute || pending.cancel || pending.veto;

  // Needs a wallet: without one, ask to connect instead of sending
  const withWallet = (action: () => void) => () => (account ? action() : setShowConnect(true));

  const main =
    proposal.status === ProposalState.SUCCEEDED ? (
      <div className={classes.step}>
        <p className={classes.note}>
          <Trans>
            This proposal passed. Queue it to start the treasury's 2-day delay, after which it can be
            executed. Anyone can do this.
          </Trans>
        </p>
        <Button className={classes.primary} disabled={busy} onClick={withWallet(onQueue)}>
          {pending.queue ? <Spinner animation="border" size="sm" /> : account ? <Trans>Queue proposal</Trans> : <Trans>Connect wallet to queue</Trans>}
        </Button>
      </div>
    ) : isQueued ? (
      <div className={classes.step}>
        <p className={classes.note}>
          {isExecutable ? (
            <Trans>
              Ready to execute. Anyone can, until {expires?.format('MMM D, h:mm A')}, when it expires.
            </Trans>
          ) : (
            <Trans>
              Queued. It can be executed in <strong>{countdown((eta ?? now) - now)}</strong>, on{' '}
              {dayjs(eta).format('MMM D [at] h:mm A')}.
            </Trans>
          )}
        </p>
        <Button className={classes.primary} disabled={busy || !isExecutable} onClick={withWallet(onExecute)}>
          {pending.execute ? (
            <Spinner animation="border" size="sm" />
          ) : !isExecutable ? (
            <Trans>Execute in {countdown((eta ?? now) - now)}</Trans>
          ) : account ? (
            <Trans>Execute proposal</Trans>
          ) : (
            <Trans>Connect wallet to execute</Trans>
          )}
        </Button>
      </div>
    ) : null;

  const stop = canStop && (isProposer || isVetoer) && (
    <div className={classes.stopRow}>
      {isProposer && (
        <Button
          className={classes.secondary}
          disabled={busy}
          onClick={() =>
            window.confirm('Cancel this proposal? It can’t be undone.') && withWallet(onCancel)()
          }
        >
          {pending.cancel ? <Spinner animation="border" size="sm" /> : <Trans>Cancel your proposal</Trans>}
        </Button>
      )}
      {isVetoer && (
        <Button
          className={clsx(classes.secondary, classes.danger)}
          disabled={busy}
          onClick={() =>
            window.confirm('Veto this proposal? It stops it for good and can’t be undone.') &&
            withWallet(onVeto)()
          }
        >
          {pending.veto ? <Spinner animation="border" size="sm" /> : <Trans>Veto proposal</Trans>}
        </Button>
      )}
    </div>
  );

  if (!main && !stop) return null;
  return (
    <div className={classes.actions}>
      {showConnect && <WalletConnectModal onDismiss={() => setShowConnect(false)} />}
      {main}
      {stop}
    </div>
  );
};

export default ProposalActions;
