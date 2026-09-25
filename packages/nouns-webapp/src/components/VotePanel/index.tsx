import { Button, FloatingLabel, FormControl, Spinner } from 'react-bootstrap';
import classes from './VotePanel.module.css';
import { useCastVote, useCastVoteWithReason, Vote } from '../../wrappers/alpsDao';
import { forwardRef, ReactNode, useCallback, useEffect, useState } from 'react';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { TransactionStatus } from '../../hooks/useTransaction';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import { SafeTxProgress } from '../../utils/safe';
import SafeTxNotice from '../SafeTxNotice';
import { ProposalVoteEntry } from '../../hooks/useProposalVotes';
import { VoteSupportLabel } from '../ProposalActivityFeed';

interface VotePanelProps {
  proposalId: string | undefined;
  availableVotes: number;
  isWalletConnected: boolean;
  // The connected account's vote, once it has voted
  userVote?: ProposalVoteEntry;
  // When the proposal was created: voting power is fixed as of then
  snapshotTimestamp?: number;
  onVoteCast?: (receipt: TransactionReceipt) => void;
}

/**
 * Inline voting form for an active proposal: pick for/against/abstain, optionally give a reason, submit.
 */
const VotePanel = forwardRef<HTMLDivElement, VotePanelProps>(
  ({ proposalId, availableVotes, isWalletConnected, userVote, snapshotTimestamp, onVoteCast }, ref) => {
    const { castVote, castVoteState } = useCastVote();
    const { castVoteWithReason, castVoteWithReasonState } = useCastVoteWithReason();
    const [vote, setVote] = useState<Vote>();
    const [voteReason, setVoteReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVoteSucessful, setIsVoteSuccessful] = useState(false);
    const [isVoteFailed, setIsVoteFailed] = useState(false);
    const [failureCopy, setFailureCopy] = useState<ReactNode>('');
    const [errorMessage, setErrorMessage] = useState<ReactNode>('');
    // Set while the vote waits in the connected Safe's queue
    const [safeTx, setSafeTx] = useState<SafeTxProgress>();

    const getVoteErrorMessage = (error: string | undefined) => {
      if (error?.match(/voter already voted/)) {
        return <Trans>User Already Voted</Trans>;
      }
      return error;
    };

    const handleVoteStateChange = useCallback(
      (state: TransactionStatus) => {
        switch (state.status) {
          case 'None':
            setIsLoading(false);
            break;
          case 'QueuedInSafe':
            setIsLoading(false);
            setSafeTx(state.safeTx);
            break;
          case 'Mining':
            setIsLoading(true);
            break;
          case 'Success':
            setIsLoading(false);
            setIsVoteSuccessful(true);
            if (state.receipt) onVoteCast?.(state.receipt);
            break;
          case 'Fail':
            setFailureCopy(<Trans>Transaction Failed</Trans>);
            setErrorMessage(state?.errorMessage || <Trans>Please try again.</Trans>);
            setIsLoading(false);
            setIsVoteFailed(true);
            setSafeTx(undefined);
            break;
          case 'Exception':
            setFailureCopy(<Trans>Error</Trans>);
            setErrorMessage(
              getVoteErrorMessage(state?.errorMessage) || <Trans>Please try again.</Trans>,
            );
            setIsLoading(false);
            setIsVoteFailed(true);
            setSafeTx(undefined);
            break;
        }
      },
      [onVoteCast],
    );

    // Cast vote transaction state hook
    useEffect(() => {
      handleVoteStateChange(castVoteState);
    }, [castVoteState, handleVoteStateChange]);

    // Cast vote with reason transaction state hook
    useEffect(() => {
      handleVoteStateChange(castVoteWithReasonState);
    }, [castVoteWithReasonState, handleVoteStateChange]);

    const voteOptions = [
      {
        vote: Vote.FOR,
        className: classes.voteFor,
        label:
          availableVotes > 1 ? (
            <Trans>
              Cast {i18n.number(availableVotes)} votes for Prop {i18n.number(parseInt(proposalId || '0'))}
            </Trans>
          ) : (
            <Trans>Cast 1 vote for Prop {i18n.number(parseInt(proposalId || '0'))}</Trans>
          ),
      },
      {
        vote: Vote.AGAINST,
        className: classes.voteAgainst,
        label:
          availableVotes > 1 ? (
            <Trans>
              Cast {i18n.number(availableVotes)} votes against Prop {i18n.number(parseInt(proposalId || '0'))}
            </Trans>
          ) : (
            <Trans>Cast 1 vote against Prop {i18n.number(parseInt(proposalId || '0'))}</Trans>
          ),
      },
      {
        vote: Vote.ABSTAIN,
        className: classes.voteAbstain,
        label: <Trans>Abstain from voting on Prop {i18n.number(parseInt(proposalId || '0'))}</Trans>,
      },
    ];

    const snapshotNote = snapshotTimestamp ? (
      <p className={classes.snapshotNote}>
        <Trans>
          Only Alps you owned or were delegated to you before{' '}
          {i18n.date(new Date(snapshotTimestamp * 1000), {
            dateStyle: 'long',
            timeStyle: 'long',
          })}{' '}
          are eligible to vote.
        </Trans>
      </p>
    ) : null;

    const content = (() => {
      if (isVoteFailed) {
        return (
          <div className={classes.transactionStatus}>
            <p className={classes.voteFailureTitle}>
              <Trans>There was an error voting for your account.</Trans>
            </p>
            <div className={classes.voteFailureBody}>
              {failureCopy}: <span className={classes.voteFailureErrorMessage}>{errorMessage}</span>
            </div>
            <Button className={classes.tryAgainBtn} onClick={() => setIsVoteFailed(false)}>
              <Trans>Try again</Trans>
            </Button>
          </div>
        );
      }
      if (safeTx && !isVoteSucessful) {
        return (
          <p className={classes.transactionStatus}>
            <SafeTxNotice safeTx={safeTx} />
          </p>
        );
      }
      if (userVote || isVoteSucessful) {
        return (
          <div className={classes.transactionStatus}>
            {userVote ? (
              <p>
                <Trans>
                  You voted <VoteSupportLabel support={userVote.support} /> with{' '}
                  {i18n.number(userVote.votes)} votes
                </Trans>
              </p>
            ) : (
              <p>
                <Trans>You've successfully voted on prop {i18n.number(parseInt(proposalId || '0'))}</Trans>
              </p>
            )}
            {isVoteSucessful && (
              <div className={classes.voteSuccessBody}>
                <Trans>Thank you for voting.</Trans>
              </div>
            )}
          </div>
        );
      }
      if (!isWalletConnected) {
        return (
          <p className={classes.panelNote}>
            <Trans>Connect a wallet to vote.</Trans>
          </p>
        );
      }
      if (!availableVotes) {
        return (
          <>
            <p className={classes.panelNote}>
              <Trans>You have no votes.</Trans>
            </p>
            {snapshotNote}
          </>
        );
      }
      return (
        <div className={clsx(classes.votingButtonsWrapper, isLoading ? classes.disabled : '')}>
          <div className={classes.voteOptions}>
            {voteOptions.map(option => (
              <button
                key={option.vote}
                type="button"
                aria-pressed={vote === option.vote}
                disabled={isLoading}
                onClick={() => setVote(option.vote)}
                className={clsx(
                  classes.voteOption,
                  option.className,
                  vote === option.vote && classes.selected,
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <br />
          <FloatingLabel controlId="reasonTextarea" label={<Trans>Reason (Optional)</Trans>}>
            <FormControl
              as="textarea"
              placeholder={
                i18n.locale === 'en' ? `Reason for voting ${Vote[vote ?? Vote.FOR]}` : ''
              }
              value={voteReason}
              onChange={e => setVoteReason(e.target.value)}
              className={classes.voteReasonTextarea}
            />
          </FloatingLabel>
          <br />
          <Button
            onClick={() => {
              if (vote === undefined || !proposalId || isLoading) {
                return;
              }
              setIsLoading(true);
              if (voteReason.trim() === '') {
                castVote(proposalId, vote);
              } else {
                castVoteWithReason(proposalId, vote, voteReason);
              }
            }}
            className={vote === undefined ? classes.submitBtnDisabled : classes.submitBtn}
          >
            {isLoading ? <Spinner animation="border" /> : <Trans>Submit Vote</Trans>}
          </Button>
          {snapshotNote}
        </div>
      );
    })();

    return (
      <div ref={ref} className={classes.votePanel}>
        <h2 className={classes.panelTitle}>
          <Trans>Vote on Prop {i18n.number(parseInt(proposalId || '0'))}</Trans>
        </h2>
        {content}
      </div>
    );
  },
);

export default VotePanel;
