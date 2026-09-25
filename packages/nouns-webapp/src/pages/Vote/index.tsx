import { Row, Col, Button, Card, Spinner } from 'react-bootstrap';
import Section from '../../layout/Section';
import {
  ProposalState,
  useCurrentQuorum,
  useExecuteProposal,
  useProposal,
  useQueueProposal,
} from '../../wrappers/alpsDao';
import { useUserVotesAsOfBlock } from '../../wrappers/alpToken';
import classes from './Vote.module.css';
import { RouteComponentProps } from 'react-router-dom';
import { TransactionStatus } from '../../hooks/useTransaction';
import { AlertModal, setAlertModal } from '../../state/slices/application';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advanced from 'dayjs/plugin/advancedFormat';
import VotePanel from '../../components/VotePanel';
import ProposalActivityFeed from '../../components/ProposalActivityFeed';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import clsx from 'clsx';
import ProposalHeader from '../../components/ProposalHeader';
import { ProposalDescription, ProposalTransactions } from '../../components/ProposalContent';
import ProposalTabs from '../../components/ProposalTabs';
import { isMobileScreen } from '../../utils/isMobile';
import { useBlockTimestamp } from '../../hooks/useBlockTimestamp';
import VoteCard, { VoteCardVariant } from '../../components/VoteCard';
import { useQuery } from '@apollo/client';
import {
  delegateAlpsAtBlockQuery,
  Delegates,
  propUsingDynamicQuorum,
} from '../../wrappers/subgraph';
import { useProposalVotes } from '../../hooks/useProposalVotes';
import { getAlpVotes } from '../../utils/getAlpsVotes';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import { ReactNode } from 'react-markdown/lib/react-markdown';
import { AVERAGE_BLOCK_TIME_IN_SECS } from '../../utils/constants';
import { SearchIcon } from '@heroicons/react/solid';
import ReactTooltip from 'react-tooltip';
import DynamicQuorumInfoModal from '../../components/DynamicQuorumInfoModal';
import SafeTxNotice from '../../components/SafeTxNotice';
import { useBlockNumber } from '../../hooks/useBlockNumber';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advanced);

const VotePage = ({
  match: {
    params: { id },
  },
}: RouteComponentProps<{ id: string }>) => {
  const proposal = useProposal(id);

  const votePanelRef = useRef<HTMLDivElement>(null);
  const [showDynamicQuorumInfoModal, setShowDynamicQuorumInfoModal] = useState<boolean>(false);
  // Toggle between Alp centric view and delegate view
  const [isDelegateView, setIsDelegateView] = useState(false);

  const [isQueuePending, setQueuePending] = useState<boolean>(false);
  const [isExecutePending, setExecutePending] = useState<boolean>(false);

  const dispatch = useAppDispatch();
  const setModal = useCallback((modal: AlertModal) => dispatch(setAlertModal(modal)), [dispatch]);
  const {
    data: dqInfo,
    loading: loadingDQInfo,
    error: dqError,
  } = useQuery(propUsingDynamicQuorum(id ?? '0'));

  const { queueProposal, queueProposalState } = useQueueProposal();
  const { executeProposal, executeProposalState } = useExecuteProposal();

  // Get and format date from data
  const timestamp = Date.now();
  const currentBlock = useBlockNumber();
  const startDate =
    proposal && timestamp && currentBlock
      ? dayjs(timestamp).add(
          AVERAGE_BLOCK_TIME_IN_SECS * (proposal.startBlock - currentBlock),
          'seconds',
        )
      : undefined;

  const endDate =
    proposal && timestamp && currentBlock
      ? dayjs(timestamp).add(
          AVERAGE_BLOCK_TIME_IN_SECS * (proposal.endBlock - currentBlock),
          'seconds',
        )
      : undefined;
  const now = dayjs();

  const activeAccount = useAppSelector(state => state.account.activeAccount);
  const {
    votes,
    loading,
    error,
    recordReceipt,
  } = useProposalVotes(proposal?.id, proposal?.status === ProposalState.ACTIVE);
  const userVote = votes.find(v => v.voter === activeAccount?.toLowerCase());

  // Tally from the live vote list, so votes show up as soon as they're cast
  const tally = (support: number) =>
    votes.filter(v => v.support === support).reduce((sum, v) => sum + v.votes, 0);
  const liveProposal = proposal && {
    ...proposal,
    forCount: tally(1),
    againstCount: tally(0),
    abstainCount: tally(2),
  };

  // Get total votes and format percentages for UI
  const totalVotes = liveProposal
    ? liveProposal.forCount + liveProposal.againstCount + liveProposal.abstainCount
    : undefined;
  const forPercentage = liveProposal && totalVotes ? (liveProposal.forCount * 100) / totalVotes : 0;
  const againstPercentage =
    liveProposal && totalVotes ? (liveProposal.againstCount * 100) / totalVotes : 0;
  const abstainPercentage =
    liveProposal && totalVotes ? (liveProposal.abstainCount * 100) / totalVotes : 0;

  // Only count available votes as of the proposal created block
  const availableVotes = useUserVotesAsOfBlock(proposal?.createdBlock ?? undefined);
  const snapshotTimestamp = useBlockTimestamp(proposal?.createdBlock);

  const currentQuorum = useCurrentQuorum(
    proposal && proposal.id ? parseInt(proposal.id) : 0,
    dqInfo && dqInfo.proposal ? dqInfo.proposal.quorumCoefficient === '0' : true,
  );

  const hasSucceeded = proposal?.status === ProposalState.SUCCEEDED;
  const isAwaitingStateChange = () => {
    if (hasSucceeded) {
      return true;
    }
    if (proposal?.status === ProposalState.QUEUED) {
      return new Date() >= (proposal?.eta ?? Number.MAX_SAFE_INTEGER);
    }
    return false;
  };

  const startOrEndTimeCopy = () => {
    if (startDate?.isBefore(now) && endDate?.isAfter(now)) {
      return <Trans>Ends</Trans>;
    }
    if (endDate?.isBefore(now)) {
      return <Trans>Ended</Trans>;
    }
    return <Trans>Starts</Trans>;
  };

  const startOrEndTimeTime = () => {
    if (!startDate?.isBefore(now)) {
      return startDate;
    }
    return endDate;
  };

  const moveStateButtonAction = hasSucceeded ? <Trans>Queue</Trans> : <Trans>Execute</Trans>;
  const moveStateAction = (() => {
    if (hasSucceeded) {
      return () => {
        if (proposal?.id) {
          return queueProposal(proposal.id);
        }
      };
    }
    return () => {
      if (proposal?.id) {
        return executeProposal(proposal.id);
      }
    };
  })();

  const onTransactionStateChange = useCallback(
    (
      tx: TransactionStatus,
      successMessage?: ReactNode,
      setPending?: (isPending: boolean) => void,
      getErrorMessage?: (error?: string) => ReactNode | undefined,
      onFinalState?: () => void,
    ) => {
      switch (tx.status) {
        case 'None':
          setPending?.(false);
          break;
        case 'QueuedInSafe':
          setModal({
            title: <Trans>Sent to your Safe</Trans>,
            message: tx.safeTx && <SafeTxNotice safeTx={tx.safeTx} />,
            show: true,
          });
          setPending?.(false);
          break;
        case 'Mining':
          setPending?.(true);
          break;
        case 'Success':
          setModal({
            title: <Trans>Success</Trans>,
            message: successMessage || <Trans>Transaction Successful!</Trans>,
            show: true,
          });
          setPending?.(false);
          onFinalState?.();
          break;
        case 'Fail':
          setModal({
            title: <Trans>Transaction Failed</Trans>,
            message: tx?.errorMessage || <Trans>Please try again.</Trans>,
            show: true,
          });
          setPending?.(false);
          onFinalState?.();
          break;
        case 'Exception':
          setModal({
            title: <Trans>Error</Trans>,
            message: getErrorMessage?.(tx?.errorMessage) || <Trans>Please try again.</Trans>,
            show: true,
          });
          setPending?.(false);
          onFinalState?.();
          break;
      }
    },
    [setModal],
  );

  useEffect(
    () =>
      onTransactionStateChange(
        queueProposalState,
        <Trans>Proposal Queued!</Trans>,
        setQueuePending,
      ),
    [queueProposalState, onTransactionStateChange, setModal],
  );

  useEffect(
    () =>
      onTransactionStateChange(
        executeProposalState,
        <Trans>Proposal Executed!</Trans>,
        setExecutePending,
      ),
    [executeProposalState, onTransactionStateChange, setModal],
  );

  const voterIds = votes.map(v => v.voter);
  const { data: delegateSnapshot } = useQuery<Delegates>(
    delegateAlpsAtBlockQuery(voterIds, proposal?.createdBlock ?? 0),
    {
      skip: !voterIds.length,
    },
  );

  const { delegates } = delegateSnapshot || {};
  const delegateToAlpIds = delegates?.reduce<Record<string, string[]>>((acc, curr) => {
    acc[curr.id] = curr?.alpsRepresented?.map(nr => nr.id) ?? [];
    return acc;
  }, {});

  const data = votes.map(v => ({
    delegate: v.voter,
    supportDetailed: v.support,
    alpsRepresented: delegateToAlpIds?.[v.voter] ?? [],
  }));

  const [showToast, setShowToast] = useState(true);
  useEffect(() => {
    if (showToast) {
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  }, [showToast]);

  if (!proposal || !liveProposal || loading || loadingDQInfo || !dqInfo) {
    return (
      <div className={classes.spinner}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || dqError) {
    return <Trans>Failed to fetch</Trans>;
  }

  const isWalletConnected = !(activeAccount === undefined);
  const isActiveForVoting = startDate?.isBefore(now) && endDate?.isAfter(now);

  const forAlps = getAlpVotes(data, 1);
  const againstAlps = getAlpVotes(data, 0);
  const abstainAlps = getAlpVotes(data, 2);
  const isV2Prop = dqInfo.proposal.quorumCoefficient > 0;

  const votePanel = isActiveForVoting && (
    <VotePanel
      ref={votePanelRef}
      proposalId={proposal.id}
      availableVotes={availableVotes || 0}
      isWalletConnected={isWalletConnected}
      userVote={userVote}
      snapshotTimestamp={snapshotTimestamp}
      onVoteCast={recordReceipt}
    />
  );
  const activityTab = {
    key: 'activity',
    label: <Trans>Activity</Trans>,
    count: votes.length,
    content: <ProposalActivityFeed proposal={liveProposal} votes={votes} currentBlock={currentBlock} />,
  };
  const transactionsTab = {
    key: 'transactions',
    label: <Trans>Transactions</Trans>,
    count: proposal.details.length,
    content: <ProposalTransactions proposal={proposal} />,
  };

  return (
    <Section fullWidth={false} className={classes.votePage}>
      {showDynamicQuorumInfoModal && (
        <DynamicQuorumInfoModal
          proposal={proposal}
          againstVotesAbsolute={againstAlps.length}
          onDismiss={() => setShowDynamicQuorumInfoModal(false)}
        />
      )}
      <Col lg={10} className={classes.wrapper}>
        {proposal && (
          <ProposalHeader
            proposal={proposal}
            isActiveForVoting={isActiveForVoting}
            isWalletConnected={isWalletConnected}
            userVote={userVote}
            submitButtonClickHandler={() =>
              votePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          />
        )}
      </Col>
      <Col lg={10} className={clsx(classes.proposal, classes.wrapper)}>
        {isAwaitingStateChange() && (
          <Row className={clsx(classes.section, classes.transitionStateButtonSection)}>
            <Col className="d-grid">
              <Button
                onClick={moveStateAction}
                disabled={isQueuePending || isExecutePending}
                variant="dark"
                className={classes.transitionStateButton}
              >
                {isQueuePending || isExecutePending ? (
                  <Spinner animation="border" />
                ) : (
                  <Trans>{moveStateButtonAction} Proposal ⌐◧-◧</Trans>
                )}
              </Button>
            </Col>
          </Row>
        )}

        <p
          onClick={() => setIsDelegateView(!isDelegateView)}
          className={classes.toggleDelegateVoteView}
        >
          {isDelegateView ? (
            <Trans>Switch to Alp view</Trans>
          ) : (
            <Trans>Switch to delegate view</Trans>
          )}
        </p>
        <Row>
          <VoteCard
            proposal={liveProposal}
            percentage={forPercentage}
            alpIds={forAlps}
            variant={VoteCardVariant.FOR}
            delegateView={isDelegateView}
            delegateGroupedVoteData={data}
          />
          <VoteCard
            proposal={liveProposal}
            percentage={againstPercentage}
            alpIds={againstAlps}
            variant={VoteCardVariant.AGAINST}
            delegateView={isDelegateView}
            delegateGroupedVoteData={data}
          />
          <VoteCard
            proposal={liveProposal}
            percentage={abstainPercentage}
            alpIds={abstainAlps}
            variant={VoteCardVariant.ABSTAIN}
            delegateView={isDelegateView}
            delegateGroupedVoteData={data}
          />
        </Row>

        {/* TODO abstract this into a component  */}
        <Row>
          <Col xl={4} lg={12}>
            <Card className={classes.voteInfoCard}>
              <Card.Body className="p-2">
                <div className={classes.voteMetadataRow}>
                  <div className={classes.voteMetadataRowTitle}>
                    <h1>
                      <Trans>Threshold</Trans>
                    </h1>
                  </div>
                  {isV2Prop && (
                    <ReactTooltip
                      id={'view-dq-info'}
                      className={classes.delegateHover}
                      getContent={dataTip => {
                        return <Trans>View Dynamic Quorum Info</Trans>;
                      }}
                    />
                  )}
                  <div
                    data-for="view-dq-info"
                    data-tip="View Dynamic Quorum Info"
                    onClick={() => setShowDynamicQuorumInfoModal(true && isV2Prop)}
                    className={clsx(classes.thresholdInfo, isV2Prop ? classes.cursorPointer : '')}
                  >
                    <span>{isV2Prop ? <Trans>Current Quorum</Trans> : <Trans>Quorum</Trans>}</span>
                    <h3>
                      <Trans>
                        {isV2Prop ? i18n.number(currentQuorum ?? 0) : proposal.quorumVotes} votes
                      </Trans>
                      {isV2Prop && <SearchIcon className={classes.dqIcon} />}
                    </h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xl={4} lg={12}>
            <Card className={classes.voteInfoCard}>
              <Card.Body className="p-2">
                <div className={classes.voteMetadataRow}>
                  <div className={classes.voteMetadataRowTitle}>
                    <h1>{startOrEndTimeCopy()}</h1>
                  </div>
                  <div className={classes.voteMetadataTime}>
                    <span>
                      {startOrEndTimeTime() &&
                        i18n.date(new Date(startOrEndTimeTime()?.toISOString() || 0), {
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZoneName: 'short',
                        })}
                    </span>
                    <h3>
                      {startOrEndTimeTime() &&
                        i18n.date(new Date(startOrEndTimeTime()?.toISOString() || 0), {
                          dateStyle: 'long',
                        })}
                    </h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xl={4} lg={12}>
            <Card className={classes.voteInfoCard}>
              <Card.Body className="p-2">
                <div className={classes.voteMetadataRow}>
                  <div className={classes.voteMetadataRowTitle}>
                    <h1>Snapshot</h1>
                  </div>
                  <div className={classes.snapshotBlock}>
                    <span>
                      <Trans>Taken at block</Trans>
                    </span>
                    <h3>{proposal.createdBlock}</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {isMobileScreen() ? (
          // Phones: voting, then everything else one tap away instead of below the description
          <div className={classes.mobileSections}>
            {votePanel}
            <ProposalTabs
              tabs={[
                {
                  key: 'description',
                  label: <Trans>Description</Trans>,
                  content: <ProposalDescription proposal={proposal} />,
                },
                activityTab,
                transactionsTab,
              ]}
            />
          </div>
        ) : (
          <Row>
            <Col lg={7} className={classes.section}>
              <h5>
                <Trans>Description</Trans>
              </h5>
              <ProposalDescription proposal={proposal} />
            </Col>
            <Col lg={5} className={classes.sidebar}>
              {votePanel}
              <ProposalTabs tabs={[activityTab, transactionsTab]} />
            </Col>
          </Row>
        )}
      </Col>
    </Section>
  );
};

export default VotePage;
