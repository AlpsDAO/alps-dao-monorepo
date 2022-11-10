import { useQuery } from '@apollo/client';
import { AlpVoteHistory } from '../components/ProfileActivityFeed';
import { useAlpCanVoteTimestamp } from './alpsAuction';
import { Proposal, ProposalState, useAllProposals } from './alpsDao';
import {
  createTimestampAllProposals,
  alpDelegationHistoryQuery,
  alpTransferHistoryQuery,
  alpVotingHistoryQuery,
} from './subgraph';

export enum AlpEventType {
  PROPOSAL_VOTE,
  DELEGATION,
  TRANSFER,
  AUCTION_WIN,
}

export type ProposalVoteEvent = {
  proposal: Proposal;
  vote: {
    // Delegate (possibly holder in case of self-delegation) ETH address (undefined in the case of no vote cast)
    voter: string | undefined;
    supportDetailed: 0 | 1 | 2 | undefined;
  };
};

export type TransferEvent = {
  from: string;
  to: string;
  transactionHash: string;
};

export type DelegationEvent = {
  previousDelegate: string;
  newDelegate: string;
  transactionHash: string;
};

// Wrapper type around Alp events.
// All events are keyed by blockNumber to allow sorting.
export type AlpProfileEvent = {
  blockNumber: number;
  eventType: AlpEventType;
  payload: ProposalVoteEvent | DelegationEvent | TransferEvent | AlpWinEvent;
};

export type AlpWinEvent = {
  alpId: string | number;
  winner: string;
  transactionHash: string;
};

export type AlpProfileEventFetcherResponse = {
  data?: AlpProfileEvent[];
  error: boolean;
  loading: boolean;
};

/**
 * Fetch list of ProposalVoteEvents representing the voting history of the given Alp
 * @param alpId Id of Alp who's voting history will be fetched
 */
const useAlpProposalVoteEvents = (alpId: number): AlpProfileEventFetcherResponse => {
  const { loading, error, data } = useQuery(alpVotingHistoryQuery(alpId));

  const {
    loading: proposalTimestampLoading,
    error: proposalTimestampError,
    data: proposalCreatedTimestamps,
  } = useQuery(createTimestampAllProposals());

  const alpCanVoteTimestamp = useAlpCanVoteTimestamp(alpId);

  const { data: proposals } = useAllProposals();

  if (loading || !proposals || !proposals.length || proposalTimestampLoading) {
    return {
      loading: true,
      error: false,
    };
  } else if (error || proposalTimestampError) {
    return {
      loading: false,
      error: true,
    };
  }

  const alpVotes: { [key: string]: AlpVoteHistory } = data.alp.votes
    .slice(0)
    .reduce((acc: any, h: AlpVoteHistory, i: number) => {
      acc[h.proposal.id] = h;
      return acc;
    }, {});

  const filteredProposals = proposals.filter((p: Proposal, id: number) => {
    if (!p.id) {
      return false;
    }

    const proposalCreationTimestamp = parseInt(
      proposalCreatedTimestamps.proposals[id].createdTimestamp,
    );

    // Filter props from before the Alp was born
    if (alpCanVoteTimestamp.gt(proposalCreationTimestamp)) {
      return false;
    }
    // Filter props which were cancelled and got 0 votes of any kind
    if (
      p.status === ProposalState.CANCELLED &&
      p.forCount + p.abstainCount + p.againstCount === 0
    ) {
      return false;
    }
    return true;
  });

  const events = filteredProposals.map((proposal: Proposal) => {
    const vote = alpVotes[proposal.id as string];
    const didVote = vote !== undefined;
    return {
      // If no vote was cast, for indexing / sorting purposes declear the block number of this event
      // to be the end block of the voting period
      blockNumber: didVote ? parseInt(vote.blockNumber.toString()) : proposal.endBlock,
      eventType: AlpEventType.PROPOSAL_VOTE,
      payload: {
        proposal,
        vote: {
          voter: didVote ? vote.voter.id : undefined,
          supportDetailed: didVote ? vote.supportDetailed : undefined,
        },
      },
    };
  }) as AlpProfileEvent[];

  return {
    loading: false,
    error: false,
    data: events,
  };
};

/**
 * Fetch list of TransferEvents for given Alp
 * @param alpId Id of Alp who's transfer history we will fetch
 */
const useAlpTransferEvents = (alpId: number): AlpProfileEventFetcherResponse => {
  const { loading, error, data } = useQuery(alpTransferHistoryQuery(alpId));
  if (loading) {
    return {
      loading,
      error: false,
    };
  }

  if (error) {
    return {
      loading,
      error: true,
    };
  }

  return {
    loading: false,
    error: false,
    data: data.transferEvents.map(
      (event: {
        blockNumber: string;
        previousHolder: { id: any };
        newHolder: { id: any };
        id: any;
      }) => {
        return {
          blockNumber: parseInt(event.blockNumber),
          eventType: AlpEventType.TRANSFER,
          payload: {
            from: event.previousHolder.id,
            to: event.newHolder.id,
            transactionHash: event.id.substring(0, event.id.indexOf('_')),
          } as TransferEvent,
        } as AlpProfileEvent;
      },
    ),
  };
};

/**
 * Fetch list of DelegationEvents for given Alp
 * @param alpId Id of Alp who's transfer history we will fetch
 */
const useDelegationEvents = (alpId: number): AlpProfileEventFetcherResponse => {
  const { loading, error, data } = useQuery(alpDelegationHistoryQuery(alpId));
  if (loading) {
    return {
      loading,
      error: false,
    };
  }

  if (error) {
    return {
      loading,
      error: true,
    };
  }

  return {
    loading: false,
    error: false,
    data: data.delegationEvents.map(
      (event: {
        blockNumber: string;
        previousDelegate: { id: any };
        newDelegate: { id: any };
        id: string;
      }) => {
        return {
          blockNumber: parseInt(event.blockNumber),
          eventType: AlpEventType.DELEGATION,
          payload: {
            previousDelegate: event.previousDelegate.id,
            newDelegate: event.newDelegate.id,
            transactionHash: event.id.substring(0, event.id.indexOf('_')),
          } as DelegationEvent,
        } as AlpProfileEvent;
      },
    ),
  };
};

/**
 * Fetch list of all events for given Alp (ex: voting, transfer, delegation, etc.)
 * @param alpId Id of Alp who's history we will fetch
 */
export const useAlpActivity = (alpId: number): AlpProfileEventFetcherResponse => {
  const {
    loading: loadingVotes,
    error: votesError,
    data: votesData,
  } = useAlpProposalVoteEvents(alpId);
  const {
    loading: loadingAlpTransfer,
    error: alpTransferError,
    data: alpTransferData,
  } = useAlpTransferEvents(alpId);
  const {
    loading: loadingDelegationEvents,
    error: delegationEventsError,
    data: delegationEventsData,
  } = useDelegationEvents(alpId);

  if (loadingDelegationEvents || loadingAlpTransfer || loadingVotes) {
    return {
      loading: true,
      error: false,
    };
  }

  if (votesError || alpTransferError || delegationEventsError) {
    return {
      loading: false,
      error: true,
    };
  }

  if (
    alpTransferData === undefined ||
    votesData === undefined ||
    delegationEventsData === undefined
  ) {
    return {
      loading: true,
      error: false,
    };
  }

  const events = votesData
    ?.concat(alpTransferData)
    .concat(delegationEventsData)
    .sort((a: AlpProfileEvent, b: AlpProfileEvent) => a.blockNumber - b.blockNumber)
    .reverse();

  const postProcessedEvents = events.slice(0, events.length - (alpId % 10 === 0 ? 2 : 4));

  // Wrap this line in a try-catch to prevent edge case
  // where excessive spamming to left / right keys can cause transfer
  // and delegation data to be empty which leads to errors
  try {
    // Parse alp birth + win events into a single event
    const alpTransferFromAuctionHouse = alpTransferData.sort(
      (a: AlpProfileEvent, b: AlpProfileEvent) => a.blockNumber - b.blockNumber,
    )[alpId % 10 === 0 ? 0 : 1].payload as TransferEvent;
    const alpTransferFromAuctionHouseBlockNumber = alpTransferData.sort(
      (a: AlpProfileEvent, b: AlpProfileEvent) => a.blockNumber - b.blockNumber,
    )[alpId % 10 === 0 ? 0 : 1].blockNumber;

    const alpWinEvent = {
      alpId: alpId,
      winner: alpTransferFromAuctionHouse.to,
      transactionHash: alpTransferFromAuctionHouse.transactionHash,
    } as AlpWinEvent;

    postProcessedEvents.push({
      eventType: AlpEventType.AUCTION_WIN,
      blockNumber: alpTransferFromAuctionHouseBlockNumber,
      payload: alpWinEvent,
    } as AlpProfileEvent);
  } catch (e) {
    console.log(e);
  }

  return {
    loading: false,
    error: false,
    data: postProcessedEvents,
  };
};
