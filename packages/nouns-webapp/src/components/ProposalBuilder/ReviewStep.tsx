import React, { ReactNode, useEffect, useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { Trans } from '@lingui/macro';
import { ExclamationCircleIcon } from '@heroicons/react/outline';
import { DaoSettings } from '../../hooks/useDaoSettings';
import { ProposerEligibility } from '../../hooks/useProposerEligibility';
import { useSubmitProposal } from '../../hooks/useSubmitProposal';
import { buildEtherscanTxLink } from '../../utils/etherscan';
import { TIMELOCK_GRACE_PERIOD } from '../../utils/proposalActions/contracts';
import {
  AddressLabel,
  BlocksDuration,
  Duration,
  ProposalActionCard,
} from '../ProposalActionSummary';
import SafeTxNotice from '../SafeTxNotice';
import { CheckButton, CheckResult, useActionChecks } from './ActionCheck';
import { canPropose } from './EligibilityNotice';
import { MarkdownPreview } from './ProposalTextEditor';
import { BuilderAction } from './types';
import classes from './ProposalBuilder.module.css';

export const proposalDescription = (title: string, body: string) =>
  `# ${title.trim()}\n\n${body.trim()}`;

/** Revert reasons and wallet errors, in words a member can act on. */
const friendlyError = (message: string | undefined): ReactNode => {
  if (!message) return <Trans>The transaction failed.</Trans>;
  if (/user (rejected|denied|cancel)|rejected the request|request rejected|ACTION_REJECTED/i.test(message)) {
    return <Trans>You cancelled the transaction in your wallet.</Trans>;
  }
  if (/below proposal threshold/i.test(message)) {
    return (
      <Trans>
        This wallet doesn't have enough votes to propose. Votes count as of the block before you
        submit, so votes delegated to you just now count from the next block.
      </Trans>
    );
  }
  if (/one live proposal per proposer/i.test(message)) {
    return <Trans>You already have a proposal that's pending or being voted on.</Trans>;
  }
  if (/too many actions/i.test(message)) return <Trans>A proposal can have at most 10 actions.</Trans>;
  if (/insufficient funds/i.test(message)) {
    return <Trans>This wallet doesn't have enough ETH to pay for gas.</Trans>;
  }
  return message;
};

const Timeline: React.FC<{ settings?: DaoSettings }> = ({ settings }) => {
  if (!settings?.votingDelay || !settings.votingPeriod || !settings.timelockDelay) return null;
  return (
    <p className={classes.cardIntro}>
      <Trans>
        Once submitted, voting opens in about <BlocksDuration blocks={settings.votingDelay} /> and
        stays open for about <BlocksDuration blocks={settings.votingPeriod} />. If it passes, it
        waits in the treasury for <Duration seconds={settings.timelockDelay} />, then anyone can
        execute it within <Duration seconds={TIMELOCK_GRACE_PERIOD} />. The actions run in order,
        all together. A proposal can't be edited once submitted, though you can cancel it.
      </Trans>
    </p>
  );
};

/** Everything that will go on-chain, checked, then submitted through the governor. */
const ReviewStep: React.FC<{
  title: string;
  body: string;
  actions: BuilderAction[];
  account?: string;
  eligibility: ProposerEligibility;
  settings?: DaoSettings;
  /** Problems that block submitting, besides eligibility */
  blockers: ReactNode[];
  warnings: ReactNode[];
  onBack: () => void;
  onSubmitted: (proposalId?: number) => void;
}> = ({
  title,
  body,
  actions,
  account,
  eligibility,
  settings,
  blockers,
  warnings,
  onBack,
  onSubmitted,
}) => {
  const checks = useActionChecks();
  const { submit, state, proposalId } = useSubmitProposal();
  const [showError, setShowError] = useState(false);

  // Check every action once on arrival
  useEffect(() => {
    checks.checkAll(actions.map(a => a.tx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { refresh } = eligibility;
  useEffect(() => {
    if (state.status === 'Fail' || state.status === 'Exception') {
      setShowError(true);
      // Votes or a live proposal may be why it failed
      refresh();
    }
    if (state.status === 'Success') onSubmitted(proposalId);
  }, [state.status, proposalId, onSubmitted, refresh]);

  const failedChecks = actions
    .map((a, i) => ({ i, state: checks.resultFor(a.tx) }))
    .filter(({ state }) => state?.status === 'reverted' || state?.status === 'insufficient-eth')
    .map(({ i }) => i + 1);

  const busy = state.status === 'PendingSignature' || state.status === 'Mining';
  const eligible = !!account && canPropose(eligibility);
  const ready = eligible && !blockers.length;
  const txHash = state.transaction?.hash;

  let status: ReactNode = null;
  if (state.status === 'QueuedInSafe' && state.safeTx) {
    status = (
      <p className={classes.submitStatus}>
        <SafeTxNotice safeTx={state.safeTx} />
      </p>
    );
  } else if (state.status === 'Mining') {
    status = (
      <p className={classes.submitStatus}>
        <Trans>Submitting your proposal. This takes a few seconds once the transaction is sent.</Trans>{' '}
        {txHash && !state.safeTx && (
          <a href={buildEtherscanTxLink(txHash)} target="_blank" rel="noreferrer">
            <Trans>View transaction</Trans>
          </a>
        )}
      </p>
    );
  } else if (showError && (state.status === 'Fail' || state.status === 'Exception')) {
    status = (
      <div className={classes.errorBox} role="alert">
        <ExclamationCircleIcon />
        <span>
          {state.status === 'Fail' ? (
            <Trans>The transaction failed:</Trans>
          ) : (
            <Trans>Couldn't submit:</Trans>
          )}{' '}
          {friendlyError(state.errorMessage)}
        </span>
      </div>
    );
  }

  const count = actions.length;
  return (
    <>
      <section className={classes.card}>
        <h2 className={classes.cardTitle}>
          <Trans>How it will look</Trans>
        </h2>
        <MarkdownPreview title={title} body={body} />
      </section>

      <section className={classes.card}>
        <div className={classes.sectionHeader}>
          <h2 className={classes.cardTitle}>
            {count === 1 ? <Trans>1 action</Trans> : <Trans>{count} actions</Trans>}
          </h2>
          <button
            type="button"
            className={classes.secondaryButton}
            onClick={() => checks.checkAll(actions.map(a => a.tx))}
          >
            <Trans>Check again</Trans>
          </button>
        </div>
        <p className={classes.cardIntro}>
          <Trans>
            Each action is checked by running it as if the treasury sent it right now, on its own.
            A check can't know about earlier actions in this proposal, or what changes before it
            executes.
          </Trans>
        </p>
        {actions.map((action, i) => {
          const check = checks.resultFor(action.tx);
          return (
            <ProposalActionCard
              key={action.id}
              index={i}
              tx={action.tx}
              names={action.names}
              defaultOpen
              actions={<CheckButton state={check} onClick={() => checks.check(action.tx)} />}
              footer={<CheckResult state={check} />}
            />
          );
        })}
      </section>

      <section className={classes.card}>
        <h2 className={classes.cardTitle}>
          <Trans>Submit</Trans>
        </h2>
        <Timeline settings={settings} />
        {blockers.map((b, i) => (
          <div key={i} className={classes.errorBox}>
            <ExclamationCircleIcon />
            <span>{b}</span>
          </div>
        ))}
        {[
          ...warnings,
          ...(failedChecks.length
            ? [
                <Trans>
                  The check failed for action {failedChecks.join(', ')}. Make sure that's expected
                  (say, it depends on an earlier action) before you submit.
                </Trans>,
              ]
            : []),
        ].map((w, i) => (
          <div key={i} className={classes.warning}>
            <ExclamationCircleIcon />
            <span>{w}</span>
          </div>
        ))}
        {account && (
          <p className={classes.hint}>
            <Trans>
              Submitting from <AddressLabel address={account} />. It costs gas, and nothing else.
            </Trans>
          </p>
        )}
        {status}
        <div className={classes.submitRow}>
          <Button className={classes.secondaryButton} onClick={onBack} disabled={busy}>
            <Trans>Back to editing</Trans>
          </Button>
          <Button
            className={classes.primaryButton}
            disabled={!ready || busy || state.status === 'QueuedInSafe'}
            onClick={() => {
              setShowError(false);
              submit(
                actions.map(a => a.tx),
                proposalDescription(title, body),
              );
            }}
          >
            {state.status === 'PendingSignature' ? (
              <>
                <Spinner animation="border" size="sm" /> <Trans>Confirm in your wallet</Trans>
              </>
            ) : state.status === 'Mining' ? (
              <>
                <Spinner animation="border" size="sm" /> <Trans>Submitting…</Trans>
              </>
            ) : (
              <Trans>Submit proposal</Trans>
            )}
          </Button>
        </div>
        {!eligible && account && !eligibility.loading && (
          <p className={classes.hint} style={{ textAlign: 'right' }}>
            <Trans>This wallet can't submit yet: see the note at the top.</Trans>
          </p>
        )}
      </section>
    </>
  );
};

export default ReviewStep;
