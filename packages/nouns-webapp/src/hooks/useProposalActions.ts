import { useQuery } from '@apollo/client';
import { BigNumber, Contract, utils } from 'ethers';
import { useEffect, useState } from 'react';
import config from '../config';
import { getReadProvider } from '../utils/proposalActions/contracts';
import { ProposalActionTx } from '../utils/proposalActions/encoding';
import { proposalsQuery } from '../wrappers/subgraph';
import { ProposalSubgraphEntity } from '../wrappers/alpsDao';

const GOVERNOR_ABI = [
  'function getActions(uint256 proposalId) view returns (address[] targets, uint256[] values, string[] signatures, bytes[] calldatas)',
];

const toTxs = (
  targets: string[],
  values: Array<string | BigNumber>,
  signatures: string[],
  calldatas: string[],
): ProposalActionTx[] =>
  targets.map((target, i) => ({
    target: utils.isAddress(target) ? utils.getAddress(target) : target,
    value: BigNumber.from(values[i] ?? 0).toString(),
    signature: signatures[i] ?? '',
    calldata: calldatas[i] ?? '0x',
  }));

/**
 * A proposal's actions exactly as stored (target, value, signature, calldata): from the subgraph
 * results the proposal pages already loaded, else read from the governor.
 */
export const useProposalActions = (proposalId: string | undefined) => {
  const { data } = useQuery<{ proposals?: ProposalSubgraphEntity[] }>(proposalsQuery(), {
    fetchPolicy: 'cache-only',
    skip: !proposalId,
  });
  const indexed = data?.proposals?.find(p => p.id === proposalId);
  const fromSubgraph = indexed
    ? toTxs(indexed.targets, indexed.values, indexed.signatures, indexed.calldatas)
    : undefined;

  const [fromChain, setFromChain] = useState<{ id: string; txs: ProposalActionTx[] }>();
  const [failed, setFailed] = useState(false);
  const isIndexed = !!indexed;

  useEffect(() => {
    if (!proposalId || isIndexed) return;
    let active = true;
    setFailed(false);
    new Contract(config.addresses.alpsDAOProxy, GOVERNOR_ABI, getReadProvider())
      .getActions(proposalId)
      .then((actions: [string[], BigNumber[], string[], string[]]) => {
        if (active) setFromChain({ id: proposalId, txs: toTxs(...actions) });
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [proposalId, isIndexed]);

  const txs = fromSubgraph ?? (fromChain?.id === proposalId ? fromChain?.txs : undefined);
  return { txs, failed: !txs && failed };
};
