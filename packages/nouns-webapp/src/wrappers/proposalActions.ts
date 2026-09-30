import { useEffect, useState } from 'react';
import { useContracts } from '../hooks/useContracts';
import { useTransaction } from '../hooks/useTransaction';

// Proposal actions beyond voting. These use the V1 governor ABI, which is what's deployed.

/** Cancel a proposal: its proposer can, any time before it's executed. */
export const useCancelProposal = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();
  const cancelProposal = (proposalId: string) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.cancel(proposalId));
  };
  return { cancelProposal, cancelProposalState: status };
};

/** Veto a proposal: only the vetoer can, any time before it's executed. */
export const useVetoProposal = () => {
  const { transact, status } = useTransaction();
  const { alpsDaoProxyV1 } = useContracts();
  const vetoProposal = (proposalId: string) => {
    if (!alpsDaoProxyV1) return;
    transact(alpsDaoProxyV1.veto(proposalId));
  };
  return { vetoProposal, vetoProposalState: status };
};

/** The governor's vetoer (lowercased), or undefined until read. */
export const useVetoer = (): string | undefined => {
  const { alpsDaoProxyV1 } = useContracts();
  const [vetoer, setVetoer] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    alpsDaoProxyV1
      ?.vetoer()
      .then(address => !cancelled && setVetoer(address.toLowerCase()))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [alpsDaoProxyV1]);
  return vetoer;
};
