import { AlpsDAOV2ABI } from '@nouns/sdk';
import { utils, BigNumber as EthersBN } from 'ethers';
import { defaultAbiCoder, Result } from 'ethers/lib/utils';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useLogs } from '../hooks/useLogs';
import * as R from 'ramda';
import { useQuery } from '@apollo/client';
import { proposalsQuery } from './subgraph';
import BigNumber from 'bignumber.js';
import { useBlockTimestamp } from '../hooks/useBlockTimestamp';
import { useBlockNumber } from '../hooks/useBlockNumber';
import { useContracts } from '../hooks/useContracts';
import { useTransaction } from '../hooks/useTransaction';
import { WalletContext } from '../contexts/WalletContext';

export interface DynamicQuorumParams {
  minQuorumVotesBPS: number;
  maxQuorumVotesBPS: number;
  quorumCoefficient: number;
}

export enum Vote {
  AGAINST = 0,
  FOR = 1,
  ABSTAIN = 2,
}

export enum ProposalState {
  UNDETERMINED = -1,
  PENDING,
  ACTIVE,
  CANCELLED,
  DEFEATED,
  SUCCEEDED,
  QUEUED,
  EXPIRED,
  EXECUTED,
  VETOED,
}

interface ProposalCallResult {
  id: EthersBN;
  abstainVotes: EthersBN;
  againstVotes: EthersBN;
  forVotes: EthersBN;
  canceled: boolean;
  vetoed: boolean;
  executed: boolean;
  startBlock: EthersBN;
  endBlock: EthersBN;
  eta: EthersBN;
  proposalThreshold: EthersBN;
  proposer: string;
  quorumVotes: EthersBN;
}

interface ProposalDetail {
  target: string;
  value?: string;
  functionSig: string;
  callData: string;
}

export interface Proposal {
  id: string | undefined;
  title: string;
  description: string;
  status: ProposalState;
  forCount: number;
  againstCount: number;
  abstainCount: number;
  createdBlock: number;
  startBlock: number;
  endBlock: number;
  eta: Date | undefined;
  proposer: string | undefined;
  proposalThreshold: number;
  quorumVotes: number;
  details: ProposalDetail[];
  transactionHash: string;
}

interface ProposalTransactionDetails {
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
}

export interface ProposalSubgraphEntity extends ProposalTransactionDetails {
  id: string;
  description: string;
  status: keyof typeof ProposalState;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  createdBlock: string;
  createdTransactionHash: string;
  startBlock: string;
  endBlock: string;
  executionETA: string | null;
  proposer: { id: string };
  proposalThreshold: string;
  quorumVotes: string;
}

interface ProposalData {
  data: Proposal[];
  error?: Error;
  loading: boolean;
}

export interface ProposalTransaction {
  address: string;
  value: string;
  signature: string;
  calldata: string;
}

const hashRegex = /^\s*#{1,6}\s+([^\n]+)/;
const equalTitleRegex = /^\s*([^\n]+)\n(={3,25}|-{3,25})/;

/**
 * Extract a markdown title from a proposal body that uses the `# Title` format
 * Returns null if no title found.
 */
const extractHashTitle = (body: string) => body.match(hashRegex);
/**
 * Extract a markdown title from a proposal body that uses the `Title\n===` format.
 * Returns null if no title found.
 */
const extractEqualTitle = (body: string) => body.match(equalTitleRegex);

/**
 * Extract title from a proposal's body/description. Returns null if no title found in the first line.
 * @param body proposal body
 */
const extractTitle = (body: string | undefined): string | null => {
  if (!body) return null;
  const hashResult = extractHashTitle(body);
  const equalResult = extractEqualTitle(body);
  return hashResult ? hashResult[1] : equalResult ? equalResult[1] : null;
};

const removeBold = (text: string | null): string | null =>
  text ? text.replace(/\*\*/g, '') : text;
const removeItalics = (text: string | null): string | null =>
  text ? text.replace(/__/g, '') : text;

const removeMarkdownStyle = R.compose(removeBold, removeItalics);

export const useCurrentQuorum = (
  proposalId: number,
  skip: boolean = false,
): number | undefined => {
  const [quorum, setQuorum] = useState<EthersBN | undefined>();
  const { alpsDaoProxyV2 } = useContracts();

  useEffect(() => {
    async function getQuorum(proposalId: number, skip: boolean) {
      if (skip || !alpsDaoProxyV2) {
        setQuorum(undefined);
        return;
      }
      try {
        const quorumResponse = await alpsDaoProxyV2.quorumVotes(proposalId);
        setQuorum(quorumResponse);
      }
      catch {}
    }

    getQuorum(proposalId, skip);
  }, [proposalId, skip]);
  
  return quorum?.toNumber();
};

export const useDynamicQuorumProps = (
  block: number,
): DynamicQuorumParams | undefined => {
  const [params, setParams] = useState<DynamicQuorumParams | undefined>();
  const { alpsDaoProxyV2 } = useContracts();

  useEffect(() => {
    async function getParams(block: number) {
      if (!alpsDaoProxyV2) {
        setParams(undefined);
        return;
      }
      try {
        const paramsResponse = await alpsDaoProxyV2.getDynamicQuorumParamsAt(block);
        setParams(paramsResponse);
      }
      catch {}
    }

    getParams(block);
  }, [block]);

  return params;
};

const useVoteReceipt = (proposalId: string | undefined): { hasVoted: boolean, support: number } => {
  const [receipt, setReceipt] = useState<{ hasVoted: boolean, support: number }>({ hasVoted: false, support: -1 });
  const { account } = useContext(WalletContext);
  const { alpsDaoProxyV2 } = useContracts();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getReceipt(proposalId?: string, account?: string) {
      if (!proposalId || !account || !alpsDaoProxyV2) {
        setReceipt({ hasVoted: false, support: -1 });
        return;
      }
      try {
        const receipt = await alpsDaoProxyV2.getReceipt(proposalId, account);
        setReceipt(receipt);
      }
      catch {}
    }

    getReceipt(proposalId, account);
  }, [proposalId, account]);

  return receipt;
};

export const useHasVotedOnProposal = (proposalId: string | undefined): boolean => {
  const receipt = useVoteReceipt(proposalId);
  return receipt.hasVoted;
};

export const useProposalVote = (proposalId: string | undefined): string => {
  const receipt = useVoteReceipt(proposalId);
  const voteStatus = receipt.support;
  if (voteStatus === 0) {
    return 'Against';
  }
  if (voteStatus === 1) {
    return 'For';
  }
  if (voteStatus === 2) {
    return 'Abstain';
  }

  return '';
};

export const useProposalCount = (): number | undefined => {
  const [count, setCount] = useState<EthersBN | undefined>();
  const { alpsDaoProxyV2 } = useContracts();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getCount() {
      try {
        if (!alpsDaoProxyV2) {
          setCount(undefined);
          return;
        }
        const proposalCount = await alpsDaoProxyV2.proposalCount();
        setCount(proposalCount);
      }
      catch {}
    }

    getCount();
  }, []);

  return count?.toNumber();
};

export const useProposalThreshold = (): number | undefined => {
  const [threshold, setThreshold] = useState<EthersBN | undefined>();
  const { alpsDaoProxyV2 } = useContracts();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getThreshold() {
      try {
        if (!alpsDaoProxyV2) {
          setThreshold(undefined);
          return;
        }
        const proposalThreshold = await alpsDaoProxyV2.proposalThreshold();
        setThreshold(proposalThreshold);
      }
      catch {}
    }

    getThreshold();
  }, []);

  return threshold?.toNumber();
};

const useVotingDelay = (): number | undefined => {
  const [blockDelay, setBlockDelay] = useState<EthersBN | undefined>();
  const { alpsDaoProxyV2 } = useContracts();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getBlockDelay() {
      try {
        if (!alpsDaoProxyV2) {
          setBlockDelay(undefined);
          return;
        }
        const delay = await alpsDaoProxyV2.votingDelay();
        setBlockDelay(delay);
      }
      catch {}
    }

    getBlockDelay();
  }, []);

  return blockDelay?.toNumber();
};

const countToIndices = (count: number | undefined) => {
  return typeof count === 'number' ? new Array(count).fill(0).map((_, i) => i + 1) : [];
};

const formatProposalTransactionDetails = (details: ProposalTransactionDetails | Result) => {
  return details.targets.map((target: string, i: number) => {
    const signature = details.signatures[i];
    const value = EthersBN.from(
      // Handle both logs and subgraph responses
      (details as ProposalTransactionDetails).values?.[i] ?? (details as Result)?.[3]?.[i] ?? 0,
    );
    const [name, types] = signature.substring(0, signature.length - 1)?.split('(');
    if (!name || !types) {
      return {
        target,
        functionSig: name === '' ? 'transfer' : name === undefined ? 'unknown' : name,
        callData: types ? types : value ? `${utils.formatEther(value)} ETH` : '',
      };
    }
    const calldata = details.calldatas[i];
    const decoded = defaultAbiCoder.decode(types.split(','), calldata);
    return {
      target,
      functionSig: name,
      callData: decoded.join(),
      value: value.gt(0) ? `{ value: ${utils.formatEther(value)} ETH }` : '',
    };
  });
};

const useFormattedProposalCreatedLogs = (skip: boolean, fromBlock?: number) => {
  const { alpsDaoProxyV2 } = useContracts();
  const proposalCreatedFilter = {
    ...alpsDaoProxyV2?.filters?.ProposalCreated(null, null, null, null, null, null, null, null, null),
    fromBlock,
  };

  const filter = useMemo(
    () => ({
      ...proposalCreatedFilter,
      ...(fromBlock ? { fromBlock } : {}),
    }),
    [fromBlock],
  );
  const useLogsResult = useLogs(!skip ? filter : undefined);

  return useMemo(() => {
    return useLogsResult?.logs?.map(log => {
      const abi = new utils.Interface(AlpsDAOV2ABI);
      const { args: parsed } = abi.parseLog(log);
      return {
        description: parsed.description,
        transactionHash: log.transactionHash,
        details: formatProposalTransactionDetails(parsed),
      };
    });
  }, [useLogsResult]);
};

const getProposalState = (
  blockNumber: number | undefined,
  blockTimestamp: Date | undefined,
  proposal: ProposalSubgraphEntity,
) => {
  const status = ProposalState[proposal.status];
  if (status === ProposalState.PENDING) {
    if (!blockNumber) {
      return ProposalState.UNDETERMINED;
    }
    if (blockNumber <= parseInt(proposal.startBlock)) {
      return ProposalState.PENDING;
    }
    return ProposalState.ACTIVE;
  }
  if (status === ProposalState.ACTIVE) {
    if (!blockNumber) {
      return ProposalState.UNDETERMINED;
    }
    if (blockNumber > parseInt(proposal.endBlock)) {
      const forVotes = new BigNumber(proposal.forVotes);
      if (forVotes.lte(proposal.againstVotes) || forVotes.lt(proposal.quorumVotes)) {
        return ProposalState.DEFEATED;
      }
      if (!proposal.executionETA) {
        return ProposalState.SUCCEEDED;
      }
    }
    return status;
  }
  if (status === ProposalState.QUEUED) {
    if (!blockTimestamp || !proposal.executionETA) {
      return ProposalState.UNDETERMINED;
    }
    const GRACE_PERIOD = 14 * 60 * 60 * 24;
    if (blockTimestamp.getTime() / 1_000 >= parseInt(proposal.executionETA) + GRACE_PERIOD) {
      return ProposalState.EXPIRED;
    }
    return status;
  }
  return status;
};

export const useAllProposalsViaSubgraph = (): ProposalData => {
  const { loading, data, error } = useQuery(proposalsQuery());
  const blockNumber = useBlockNumber();
  const timestamp = useBlockTimestamp(blockNumber);

  const proposals = data?.proposals?.map((proposal: ProposalSubgraphEntity) => {
    const description = proposal.description?.replace(/\\n/g, '\n').replace(/(^['"]|['"]$)/g, '');
    return {
      id: proposal.id,
      title: R.pipe(extractTitle, removeMarkdownStyle)(description) ?? 'Untitled',
      description: description ?? 'No description.',
      proposer: proposal.proposer.id,
      status: getProposalState(blockNumber, new Date((timestamp ?? 0) * 1000), proposal),
      proposalThreshold: parseInt(proposal.proposalThreshold),
      quorumVotes: parseInt(proposal.quorumVotes),
      forCount: parseInt(proposal.forVotes),
      againstCount: parseInt(proposal.againstVotes),
      abstainCount: parseInt(proposal.abstainVotes),
      createdBlock: parseInt(proposal.createdBlock),
      startBlock: parseInt(proposal.startBlock),
      endBlock: parseInt(proposal.endBlock),
      eta: proposal.executionETA ? new Date(Number(proposal.executionETA) * 1000) : undefined,
      details: formatProposalTransactionDetails(proposal),
      transactionHash: proposal.createdTransactionHash,
    };
  });

  return {
    loading,
    error,
    data: proposals ?? [],
  };
};

export const useAllProposalsViaChain = (skip = false): ProposalData => {
  const { alpsDaoProxyV2 } = useContracts();
  const proposalCount = useProposalCount();
  const votingDelay = useVotingDelay();

  const [proposals, setProposals] = useState<Array<ProposalCallResult | undefined>>([]);
  const [proposalStates, setProposalStates] = useState<Array<ProposalState | undefined>>([]);

  const govProposalIndexes = useMemo(() => {
    return countToIndices(proposalCount);
  }, [proposalCount]);

  if (!skip && alpsDaoProxyV2) {
    (async () => {
      const localProposals = [];
      const localStates = [];
      for (const index of govProposalIndexes) {
        localProposals[index] = await alpsDaoProxyV2.proposal(index);
        localStates[index] = await alpsDaoProxyV2.state(index);
      }
      setProposals(localProposals);
      setProposalStates(localStates);
    })();
  }

  const formattedLogs = useFormattedProposalCreatedLogs(skip);

  // Early return until events are fetched
  return useMemo(() => {
    const logs = formattedLogs ?? [];
    if (!proposals.length || !logs.length) {
      return { data: [], loading: true };
    }

    return {
      data: proposals.map((proposal, i) => {
        const description = logs[i]?.description?.replace(/\\n/g, '\n');
        return {
          id: proposal?.id.toString(),
          title: R.pipe(extractTitle, removeMarkdownStyle)(description) ?? 'Untitled',
          description: description ?? 'No description.',
          proposer: proposal?.proposer,
          status: proposalStates[i] ?? ProposalState.UNDETERMINED,
          proposalThreshold: parseInt(proposal?.proposalThreshold?.toString() ?? '0'),
          quorumVotes: parseInt(proposal?.quorumVotes?.toString() ?? '0'),
          forCount: parseInt(proposal?.forVotes?.toString() ?? '0'),
          againstCount: parseInt(proposal?.againstVotes?.toString() ?? '0'),
          abstainCount: parseInt(proposal?.abstainVotes?.toString() ?? '0'),
          createdBlock: parseInt(proposal?.startBlock.sub(votingDelay ?? 0)?.toString() ?? ''),
          startBlock: parseInt(proposal?.startBlock?.toString() ?? ''),
          endBlock: parseInt(proposal?.endBlock?.toString() ?? ''),
          eta: proposal?.eta ? new Date(proposal?.eta?.toNumber() * 1000) : undefined,
          details: logs[i]?.details,
          transactionHash: logs[i]?.transactionHash,
        };
      }),
      loading: false,
    };
  }, [formattedLogs, JSON.stringify(proposalStates), JSON.stringify(proposals), votingDelay]);
};

export const useAllProposals = (): ProposalData => {
  const subgraph = useAllProposalsViaSubgraph();
  const onchain = useAllProposalsViaChain(!subgraph.error);
  return subgraph?.error ? onchain : subgraph;
};

export const useProposal = (id: string | number): Proposal | undefined => {
  const { data } = useAllProposals();
  return data?.find(p => p.id === id.toString());
};

export const useCastVote = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV2 } = useContracts();

  const castVote = (proposalId: string, vote: Vote) => {
    if (!alpsDaoProxyV2) return;
    transact(alpsDaoProxyV2.castVote(proposalId, vote));
  };

  return { castVote, castVoteState: status };
};

export const useCastVoteWithReason = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV2 } = useContracts();

  const castVoteWithReason = (proposalId: string, vote: Vote, voteReason: string) => {
    if (!alpsDaoProxyV2) return;
    transact(alpsDaoProxyV2.castVoteWithReason(proposalId, vote, voteReason));
  };
  
  return { castVoteWithReason, castVoteWithReasonState: status };
};

export const usePropose = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV2 } = useContracts();
  
  const propose = (targets: string[], values: EthersBN[], signatures: string[], calldatas: string[], description: string) => {
    if (!alpsDaoProxyV2) return;
    transact(alpsDaoProxyV2.propose(targets, values, signatures, calldatas, description));
  }
  
  return { propose, proposeState: status };
};

export const useQueueProposal = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV2 } = useContracts();

  const queueProposal = (proposalId: string) => {
    if (!alpsDaoProxyV2) return;
    transact(alpsDaoProxyV2.queue(proposalId));
  };

  return { queueProposal, queueProposalState: status };
};

export const useExecuteProposal = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV2 } = useContracts();

  const executeProposal = (proposalId: string) => {
    if (!alpsDaoProxyV2) return;
    transact(alpsDaoProxyV2.execute(proposalId));
  };
  
  return { executeProposal, executeProposalState: status };
};
