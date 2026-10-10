import { AlpsDaoLogicV1Factory } from '@nouns/sdk';
import { utils, BigNumber as EthersBN } from 'ethers';
import { defaultAbiCoder, Result } from 'ethers/lib/utils';
import { useContext, useEffect, useMemo, useState } from 'react';
import * as R from 'ramda';
import { useQuery } from '@apollo/client';
import { LIVE_QUERY, proposalsQuery } from './subgraph';
import BigNumber from 'bignumber.js';
import { useBlockNumber, useLatestBlock } from '../hooks/useBlockNumber';
import { useContracts } from '../hooks/useContracts';
import { useRefreshCount } from '../hooks/useRefreshCount';
import config, { CHAIN_ID, ETHERSCAN_API_KEY } from '../config';
import { useTransaction } from '../hooks/useTransaction';
import { WalletContext } from '../contexts/WalletContext';
import { getReadProvider } from '../utils/proposalActions/contracts';

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

const useVoteReceipt = (proposalId: string | undefined): { hasVoted: boolean, support: number } => {
  const [receipt, setReceipt] = useState<{ hasVoted: boolean, support: number }>({ hasVoted: false, support: -1 });
  const { account } = useContext(WalletContext);
  const { alpsDaoProxyV1 } = useContracts();
  const refreshCount = useRefreshCount();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getReceipt(proposalId?: string, account?: string) {
      if (!proposalId || !account || !alpsDaoProxyV1) {
        setReceipt({ hasVoted: false, support: -1 });
        return;
      }
      try {
        const receipt = await alpsDaoProxyV1.getReceipt(proposalId, account);
        setReceipt(receipt);
      }
      catch {}
    }

    getReceipt(proposalId, account);
  }, [proposalId, account, alpsDaoProxyV1, refreshCount]);

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
  const { alpsDaoProxyV1 } = useContracts();
  const refreshCount = useRefreshCount();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getCount() {
      try {
        if (!alpsDaoProxyV1) {
          setCount(undefined);
          return;
        }
        const proposalCount = await alpsDaoProxyV1.proposalCount();
        setCount(proposalCount);
      }
      catch {}
    }

    getCount();
  }, [alpsDaoProxyV1, refreshCount]);

  return count?.toNumber();
};

export const useProposalThreshold = (): number | undefined => {
  const [threshold, setThreshold] = useState<EthersBN | undefined>();
  const { alpsDaoProxyV1 } = useContracts();

  // Fetch a voting receipt for the passed proposal id
  useEffect(() => {
    async function getThreshold() {
      try {
        if (!alpsDaoProxyV1) {
          setThreshold(undefined);
          return;
        }
        const proposalThreshold = await alpsDaoProxyV1.proposalThreshold();
        setThreshold(proposalThreshold);
      }
      catch {}
    }

    getThreshold();
  }, [alpsDaoProxyV1]);

  return threshold?.toNumber();
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

const daoInterface = AlpsDaoLogicV1Factory.createInterface();

interface ProposalCreatedLog {
  id: string;
  description: string;
  createdBlock: number;
  transactionHash: string;
  details: ProposalDetail[];
}

/**
 * Every ProposalCreated log, for when the subgraph is down. Read from Etherscan's logs API: one request
 * covers the governor's whole history, where RPCs cap how many blocks a single log request may span.
 */
const useFormattedProposalCreatedLogs = (skip: boolean): ProposalCreatedLog[] | undefined => {
  const [logs, setLogs] = useState<ProposalCreatedLog[]>();
  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    const topic = daoInterface.getEventTopic('ProposalCreated');
    fetch(
      `https://api.etherscan.io/v2/api?chainid=${CHAIN_ID}&module=logs&action=getLogs&address=${config.addresses.alpsDAOProxy}&topic0=${topic}&fromBlock=0&toBlock=latest&page=1&offset=1000&apikey=${ETHERSCAN_API_KEY}`,
    )
      .then(response => response.json())
      .then(response => {
        if (cancelled || !Array.isArray(response.result)) return;
        setLogs(
          response.result.map((log: { topics: string[]; data: string; blockNumber: string; transactionHash: string }) => {
            const { args } = daoInterface.parseLog({ topics: log.topics, data: log.data });
            return {
              id: args.id.toString(),
              description: args.description,
              createdBlock: parseInt(log.blockNumber, 16),
              transactionHash: log.transactionHash,
              details: formatProposalTransactionDetails(args),
            };
          }),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [skip]);
  return logs;
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
  const { loading, data, error } = useQuery(proposalsQuery(), LIVE_QUERY);
  const latestBlock = useLatestBlock();
  const blockNumber = latestBlock?.number;
  const blockTimestamp = latestBlock && new Date(latestBlock.timestamp * 1000);

  const proposals = data?.proposals?.map((proposal: ProposalSubgraphEntity) => {
    const description = proposal.description?.replace(/\\n/g, '\n').replace(/(^['"]|['"]$)/g, '');
    return {
      id: proposal.id,
      title: R.pipe(extractTitle, removeMarkdownStyle)(description) ?? 'Untitled',
      description: description ?? 'No description.',
      proposer: proposal.proposer.id,
      status: getProposalState(blockNumber, blockTimestamp, proposal),
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

/**
 * The proposals read straight from the governor, for when the subgraph is down: each proposal and its
 * state, with the title, description and actions from its ProposalCreated log.
 */
export const useAllProposalsViaChain = (skip = false): ProposalData => {
  const { alpsDaoProxyV1 } = useContracts();
  const proposalCount = useProposalCount();
  const refreshCount = useRefreshCount();
  const [onchain, setOnchain] = useState<{ proposals: ProposalCallResult[]; states: ProposalState[] }>();

  useEffect(() => {
    if (skip || !alpsDaoProxyV1 || !proposalCount) return;
    let cancelled = false;
    Promise.all(
      countToIndices(proposalCount).map(id =>
        Promise.all([alpsDaoProxyV1.proposals(id), alpsDaoProxyV1.state(id)]),
      ),
    )
      .then(results => {
        if (cancelled) return;
        setOnchain({
          proposals: results.map(([proposal]) => proposal as unknown as ProposalCallResult),
          states: results.map(([, state]) => state as ProposalState),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [skip, alpsDaoProxyV1, proposalCount, refreshCount]);

  const formattedLogs = useFormattedProposalCreatedLogs(skip);

  return useMemo(() => {
    if (skip) return { data: [], loading: false };
    const logs = formattedLogs ?? [];
    if (!onchain || !logs.length) return { data: [], loading: true };
    const logById = new Map(logs.map(log => [log.id, log]));
    return {
      data: onchain.proposals.map((proposal, i) => {
        const id = proposal.id.toString();
        const log = logById.get(id);
        const description = log?.description?.replace(/\\n/g, '\n');
        return {
          id,
          title: R.pipe(extractTitle, removeMarkdownStyle)(description) ?? 'Untitled',
          description: description ?? 'No description.',
          proposer: proposal.proposer,
          status: onchain.states[i] ?? ProposalState.UNDETERMINED,
          proposalThreshold: proposal.proposalThreshold.toNumber(),
          quorumVotes: proposal.quorumVotes.toNumber(),
          forCount: proposal.forVotes.toNumber(),
          againstCount: proposal.againstVotes.toNumber(),
          abstainCount: proposal.abstainVotes.toNumber(),
          createdBlock: log?.createdBlock ?? 0,
          startBlock: proposal.startBlock.toNumber(),
          endBlock: proposal.endBlock.toNumber(),
          eta: proposal.eta?.gt(0) ? new Date(proposal.eta.toNumber() * 1000) : undefined,
          details: log?.details ?? [],
          transactionHash: log?.transactionHash ?? '',
        };
      }),
      loading: false,
    };
  }, [skip, formattedLogs, onchain]);
};

export const useAllProposals = (): ProposalData => {
  const subgraph = useAllProposalsViaSubgraph();
  const onchain = useAllProposalsViaChain(!subgraph.error);
  return subgraph?.error ? onchain : subgraph;
};

// Once a proposal is in one of these, it stays there
const SETTLED_STATES = [
  ProposalState.CANCELLED,
  ProposalState.DEFEATED,
  ProposalState.EXPIRED,
  ProposalState.EXECUTED,
  ProposalState.VETOED,
];

let governorReader: ReturnType<typeof AlpsDaoLogicV1Factory.connect> | undefined;
const getGovernorReader = () => {
  if (!governorReader) {
    governorReader = AlpsDaoLogicV1Factory.connect(config.addresses.alpsDAOProxy, getReadProvider());
  }
  return governorReader;
};

/**
 * A proposal's state and timelock eta straight from the governor, which the subgraph can trail by a
 * minute: read each block until the proposal is settled, and after each of the viewer's transactions.
 */
const useProposalStateFromChain = (id: string) => {
  const [read, setRead] = useState<{ id: string; status: ProposalState; eta?: Date }>();
  const settled = read?.id === id && SETTLED_STATES.includes(read.status);
  const blockNumber = useBlockNumber();
  const refreshCount = useRefreshCount();
  const tick = settled ? undefined : blockNumber;

  useEffect(() => {
    let cancelled = false;
    const governor = getGovernorReader();
    Promise.all([governor.state(id), governor.proposals(id)])
      .then(([state, proposal]) => {
        if (cancelled) return;
        const eta = proposal.eta.gt(0) ? new Date(proposal.eta.toNumber() * 1000) : undefined;
        setRead({ id, status: state as ProposalState, eta });
      })
      // e.g. an id with no proposal yet
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, tick, refreshCount]);

  return read?.id === id ? read : undefined;
};

export const useProposal = (id: string | number): Proposal | undefined => {
  const { data } = useAllProposals();
  const proposal = data?.find(p => p.id === id.toString());
  const fromChain = useProposalStateFromChain(id.toString());
  return proposal && fromChain ? { ...proposal, status: fromChain.status, eta: fromChain.eta } : proposal;
};

export const useCastVote = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();

  const castVote = (proposalId: string, vote: Vote) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.castVote(proposalId, vote));
  };

  return { castVote, castVoteState: status };
};

export const useCastVoteWithReason = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();

  const castVoteWithReason = (proposalId: string, vote: Vote, voteReason: string) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.castVoteWithReason(proposalId, vote, voteReason));
  };
  
  return { castVoteWithReason, castVoteWithReasonState: status };
};

export const usePropose = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();
  
  const propose = (targets: string[], values: EthersBN[], signatures: string[], calldatas: string[], description: string) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.propose(targets, values, signatures, calldatas, description));
  }
  
  return { propose, proposeState: status };
};

export const useQueueProposal = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();

  const queueProposal = (proposalId: string) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.queue(proposalId));
  };

  return { queueProposal, queueProposalState: status };
};

export const useExecuteProposal = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();

  const executeProposal = (proposalId: string) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.execute(proposalId));
  };
  
  return { executeProposal, executeProposalState: status };
};
