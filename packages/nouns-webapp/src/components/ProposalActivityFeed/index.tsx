import React, { ReactNode } from 'react';
import { Trans } from '@lingui/macro';
import clsx from 'clsx';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Proposal, ProposalState } from '../../wrappers/alpsDao';
import { ProposalVoteEntry } from '../../hooks/useProposalVotes';
import { useBlockTimestamps } from '../../hooks/useBlockTimestamp';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import ShortAddress from '../ShortAddress';
import { Image as AddressIcon } from '@davatar/react';
import classes from './ProposalActivityFeed.module.css';

const SUPPORT_CLASS = { 0: classes.against, 1: classes.for, 2: classes.abstain };

export const VoteSupportLabel: React.FC<{ support: 0 | 1 | 2 }> = ({ support }) => (
  <strong className={SUPPORT_CLASS[support]}>
    {support === 1 ? <Trans>For</Trans> : support === 0 ? <Trans>Against</Trans> : <Trans>Abstain</Trans>}
  </strong>
);

const voteAction = (support: 0 | 1 | 2) =>
  support === 1 ? <Trans>voted for</Trans> : support === 0 ? <Trans>voted against</Trans> : <Trans>abstained</Trans>;

const formatTime = (timestamp: number | undefined) => {
  if (!timestamp) return undefined;
  // A block can be a few seconds "ahead" of a slightly slow local clock; never show it in the future
  const time = dayjs.unix(Math.min(timestamp, Date.now() / 1000));
  if (dayjs().diff(time, 'day') < 7) return time.fromNow();
  return time.format(time.year() === dayjs().year() ? 'MMM D' : 'MMM D, YYYY');
};

interface FeedItem {
  key: string;
  // Undefined for final states the subgraph has no time for (executed, cancelled...): pinned to the top
  block?: number;
  content: ReactNode;
  body?: ReactNode;
  isEvent?: boolean;
}

// Generated address icons rather than ENS avatars: davatar batches ENS avatar lookups into one
// multicall, and a single voter's broken avatar record reverts the whole batch
const Account: React.FC<{ address: string }> = ({ address }) => (
  <a href={buildEtherscanAddressLink(address)} target="_blank" rel="noreferrer" className={classes.account}>
    <AddressIcon size={20} address={address} />
    <ShortAddress address={address} />
  </a>
);

/**
 * Proposal activity, newest first: each vote with its reason, plus the proposal's lifecycle milestones.
 */
const ProposalActivityFeed: React.FC<{
  proposal: Proposal;
  votes: ProposalVoteEntry[];
  currentBlock: number | undefined;
}> = ({ proposal, votes, currentBlock }) => {
  const { status } = proposal;
  const wasStopped = status === ProposalState.CANCELLED || status === ProposalState.VETOED;
  const hasReached = (block: number) => currentBlock !== undefined && currentBlock >= block;

  // The subgraph gives votes a block but no time, so look up each block's actual timestamp
  const blockTimestamps = useBlockTimestamps([
    ...votes.map(v => v.blockNumber),
    proposal.createdBlock,
    ...[proposal.startBlock, proposal.endBlock].filter(hasReached),
  ]);
  const timeOfBlock = (block: number | undefined) =>
    block !== undefined ? blockTimestamps[block] : undefined;

  const items: FeedItem[] = votes.map(v => ({
    key: `vote-${v.voter}`,
    block: v.blockNumber,
    content: (
      <>
        <Account address={v.voter} />{' '}
        <span className={clsx(classes.action, SUPPORT_CLASS[v.support])}>
          {voteAction(v.support)} ({v.votes})
        </span>
      </>
    ),
    body: v.reason && (
      <ReactMarkdown className={classes.reason} children={v.reason} remarkPlugins={[remarkBreaks]} />
    ),
  }));

  if (proposal.proposer) {
    items.push({
      key: 'created',
      block: proposal.createdBlock,
      content: (
        <>
          <Account address={proposal.proposer} /> <Trans>created the proposal</Trans>
        </>
      ),
    });
  }
  // Without a cancel/veto time we can't tell whether voting ever opened, so only show it otherwise
  if (!wasStopped && hasReached(proposal.startBlock)) {
    items.push({ key: 'started', block: proposal.startBlock, isEvent: true, content: <Trans>Voting started</Trans> });
  }
  if (!wasStopped && hasReached(proposal.endBlock) && status !== ProposalState.ACTIVE) {
    items.push({
      key: 'ended',
      block: proposal.endBlock,
      isEvent: true,
      content:
        status === ProposalState.DEFEATED ? (
          <Trans>
            Proposal was <strong className={classes.against}>defeated</strong>
          </Trans>
        ) : (
          <Trans>
            Proposal <strong className={classes.for}>succeeded</strong>
          </Trans>
        ),
    });
  }
  const finalState: Partial<Record<ProposalState, ReactNode>> = {
    [ProposalState.QUEUED]: proposal.eta ? (
      <Trans>Proposal was queued, executable from {dayjs(proposal.eta).format('MMM D, h:mm A')}</Trans>
    ) : (
      <Trans>Proposal was queued</Trans>
    ),
    [ProposalState.EXECUTED]: (
      <Trans>
        Proposal was <strong className={classes.for}>executed</strong>
      </Trans>
    ),
    [ProposalState.CANCELLED]: <Trans>Proposal was cancelled</Trans>,
    [ProposalState.VETOED]: (
      <Trans>
        Proposal was <strong className={classes.against}>vetoed</strong>
      </Trans>
    ),
    [ProposalState.EXPIRED]: <Trans>Proposal expired before it was executed</Trans>,
  };
  if (finalState[status]) {
    items.push({ key: 'final', isEvent: true, content: finalState[status] });
  }

  items.sort((a, b) => (b.block ?? Infinity) - (a.block ?? Infinity));

  return (
    <div className={classes.feed}>
      {!votes.length && (
        <p className={classes.empty}>
          <Trans>No votes yet.</Trans>
        </p>
      )}
      <ul className={classes.items}>
        {items.map(item => (
          <li key={item.key} className={clsx(classes.item, item.isEvent && classes.event)}>
            <div className={classes.itemHeader}>
              {item.isEvent && <span className={classes.eventDot} />}
              <span>{item.content}</span>
              {item.block !== undefined && formatTime(timeOfBlock(item.block)) && (
                <span className={classes.time}> · {formatTime(timeOfBlock(item.block))}</span>
              )}
            </div>
            {item.body}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProposalActivityFeed;
