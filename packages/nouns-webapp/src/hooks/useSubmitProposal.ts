import { BigNumber, utils } from 'ethers';
import { useMemo } from 'react';
import config from '../config';
import { ProposalActionTx } from '../utils/proposalActions/encoding';
import { usePropose } from '../wrappers/alpsDao';

const PROPOSAL_CREATED = new utils.Interface([
  'event ProposalCreated(uint256 id, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
]);

/** Submits through the site's existing `propose` path, and finds the new proposal's id once mined. */
export const useSubmitProposal = () => {
  const { propose, proposeState } = usePropose();

  const submit = (actions: ProposalActionTx[], description: string) =>
    propose(
      actions.map(a => a.target),
      actions.map(a => BigNumber.from(a.value || 0)),
      actions.map(a => a.signature),
      actions.map(a => a.calldata || '0x'),
      description,
    );

  const proposalId = useMemo(() => {
    const logs = proposeState.receipt?.logs ?? [];
    for (const log of logs) {
      if (log.address.toLowerCase() !== config.addresses.alpsDAOProxy.toLowerCase()) continue;
      try {
        const parsed = PROPOSAL_CREATED.parseLog(log);
        return BigNumber.from(parsed.args.id).toNumber();
      } catch {}
    }
    return undefined;
  }, [proposeState.receipt]);

  return { submit, state: proposeState, proposalId };
};
