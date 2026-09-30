import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import clsx from 'clsx';
import { CheckCircleIcon, ExclamationCircleIcon, UserCircleIcon } from '@heroicons/react/outline';
import { ProposerEligibility } from '../../hooks/useProposerEligibility';
import WalletConnectModal from '../WalletConnectModal';
import classes from './ProposalBuilder.module.css';

export const canPropose = (eligibility: ProposerEligibility) =>
  eligibility.votes !== undefined &&
  eligibility.threshold !== undefined &&
  eligibility.votes > eligibility.threshold &&
  !eligibility.liveProposal;

/** Whether the connected wallet can submit, and what to do about it if not. */
const EligibilityNotice: React.FC<{ account?: string; eligibility: ProposerEligibility }> = ({
  account,
  eligibility,
}) => {
  const [showConnect, setShowConnect] = useState(false);
  const { votes, threshold, liveProposal, loading } = eligibility;

  if (!account) {
    return (
      <div className={clsx(classes.notice, classes.noticeNeutral)}>
        <UserCircleIcon className={classes.noticeIcon} aria-hidden />
        <div className={classes.noticeBody}>
          <Trans>
            Connect a wallet to submit. You can start writing now: your draft is saved in this
            browser as you go.
          </Trans>
        </div>
        <Button className={classes.darkButton} onClick={() => setShowConnect(true)}>
          <Trans>Connect wallet</Trans>
        </Button>
        {showConnect && <WalletConnectModal onDismiss={() => setShowConnect(false)} />}
      </div>
    );
  }

  if (loading || votes === undefined || threshold === undefined) {
    return (
      <div className={clsx(classes.notice, classes.noticeNeutral)}>
        {loading ? (
          <>
            <Spinner animation="border" size="sm" />
            <div className={classes.noticeBody}>
              <Trans>Checking your votes…</Trans>
            </div>
          </>
        ) : (
          <div className={classes.noticeBody}>
            <Trans>Couldn't check your votes right now. You can still write your proposal.</Trans>
          </div>
        )}
      </div>
    );
  }

  const votesText = i18n.number(votes);
  const needed = threshold + 1;

  if (liveProposal) {
    const id = liveProposal.id;
    return (
      <div className={clsx(classes.notice, classes.noticeWarning)}>
        <ExclamationCircleIcon className={classes.noticeIcon} aria-hidden />
        <div className={classes.noticeBody}>
          {liveProposal.state === 'active' ? (
            <Trans>
              Your <Link to={`/vote/${id}`}>Prop {id}</Link> is being voted on. Each member can
              have one live proposal at a time, so you can submit this one once voting on Prop {id}{' '}
              ends. Keep drafting in the meantime.
            </Trans>
          ) : (
            <Trans>
              Your <Link to={`/vote/${id}`}>Prop {id}</Link> is waiting for voting to start. Each
              member can have one live proposal at a time, so you can submit this one once voting
              on Prop {id} ends. Keep drafting in the meantime.
            </Trans>
          )}
        </div>
      </div>
    );
  }

  if (votes > threshold) {
    return (
      <div className={clsx(classes.notice, classes.noticeOk)}>
        <CheckCircleIcon className={classes.noticeIcon} aria-hidden />
        <div className={classes.noticeBody}>
          {votes === 1 ? (
            <Trans>You have 1 vote, enough to submit a proposal.</Trans>
          ) : (
            <Trans>You have {votesText} votes, enough to submit a proposal.</Trans>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(classes.notice, classes.noticeWarning)}>
      <ExclamationCircleIcon className={classes.noticeIcon} aria-hidden />
      <div className={classes.noticeBody}>
        {needed === 1 ? (
          <Trans>
            Submitting a proposal takes at least 1 vote, and this wallet has none. Win an Alp at
            auction, or ask a member to delegate their votes to you. You can keep drafting in the
            meantime.
          </Trans>
        ) : (
          <Trans>
            Submitting a proposal takes at least {needed} votes, and this wallet has {votesText}.
            Win an Alp at auction, or ask members to delegate their votes to you. You can keep
            drafting in the meantime.
          </Trans>
        )}
      </div>
    </div>
  );
};

export default EligibilityNotice;
