import { useQuery } from '@apollo/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { AlpsDaoLogicV1Factory } from '@nouns/sdk';
import config from '../config';
import { proposalVotesQuery, ProposalVotes } from '../wrappers/subgraph';

export interface ProposalVoteEntry {
  // Lowercased address
  voter: string;
  // against (0), for (1), abstain (2)
  support: 0 | 1 | 2;
  votes: number;
  reason?: string;
  blockNumber: number;
}

const SUBGRAPH_POLL_MS = 30000;

const daoInterface = AlpsDaoLogicV1Factory.createInterface();

/**
 * All votes on a proposal, with reasons. The subgraph trails the chain, so while voting is open, votes
 * (including the viewer's own) are merged in from VoteCast events the moment they land.
 */
export const useProposalVotes = (proposalId: string | undefined, isVotingOpen: boolean) => {
  const { data, loading, error } = useQuery<ProposalVotes>(proposalVotesQuery(proposalId ?? '0'), {
    skip: !proposalId,
    pollInterval: isVotingOpen ? SUBGRAPH_POLL_MS : 0,
  });
  const [liveVotes, setLiveVotes] = useState<ProposalVoteEntry[]>([]);

  const addVoteCastLogs = useCallback(
    (logs: ethers.providers.Log[]) => {
      const votes = logs.flatMap((log): ProposalVoteEntry[] => {
        if (log.address.toLowerCase() !== config.addresses.alpsDAOProxy.toLowerCase()) return [];
        try {
          const { name, args } = daoInterface.parseLog(log);
          // Zero-vote votes are left out, matching the subgraph query
          if (name !== 'VoteCast' || args.proposalId.toString() !== proposalId || args.votes.isZero()) {
            return [];
          }
          return [
            {
              voter: args.voter.toLowerCase(),
              support: args.support,
              votes: args.votes.toNumber(),
              reason: args.reason || undefined,
              blockNumber: log.blockNumber,
            },
          ];
        } catch {
          return [];
        }
      });
      if (!votes.length) return;
      setLiveVotes(prev => [...prev.filter(p => !votes.some(v => v.voter === p.voter)), ...votes]);
    },
    [proposalId],
  );

  useEffect(() => {
    if (!proposalId || !isVotingOpen) return;
    const provider = new ethers.providers.WebSocketProvider(config.app.wsRpcUri);
    const filter = {
      address: config.addresses.alpsDAOProxy,
      topics: [daoInterface.getEventTopic('VoteCast')],
    };
    provider.on(filter, (log: ethers.providers.Log) => addVoteCastLogs([log]));
    return () => {
      provider.removeAllListeners();
      provider.destroy();
    };
  }, [proposalId, isVotingOpen, addVoteCastLogs]);

  const votes = useMemo(() => {
    const indexed = (data?.votes ?? []).map(
      (v): ProposalVoteEntry => ({
        voter: v.voter.id.toLowerCase(),
        support: v.supportDetailed,
        votes: Number(v.votes),
        reason: v.reason ?? undefined,
        blockNumber: Number(v.blockNumber),
      }),
    );
    // Once the subgraph has indexed a live vote, its copy wins
    const notYetIndexed = liveVotes.filter(live => !indexed.some(v => v.voter === live.voter));
    return [...indexed, ...notYetIndexed];
  }, [data, liveVotes]);

  // Picks the viewer's own vote out of their transaction receipt, in case the event subscription misses it
  const recordReceipt = useCallback(
    (receipt: TransactionReceipt) => addVoteCastLogs(receipt.logs),
    [addVoteCastLogs],
  );

  return { votes, loading: loading && !data, error, recordReceipt };
};
