import { BigNumber, Contract } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import config from '../config';
import { getReadProvider } from '../utils/proposalActions/contracts';

const GOVERNOR_ABI = [
  'function proposalThreshold() view returns (uint256)',
  'function latestProposalIds(address proposer) view returns (uint256)',
  'function state(uint256 proposalId) view returns (uint8)',
];
const TOKEN_ABI = ['function getCurrentVotes(address account) view returns (uint96)'];

// ProposalState on the governor
const PENDING = 0;
const ACTIVE = 1;

export interface ProposerEligibility {
  loading: boolean;
  votes?: number;
  /** A proposer needs more votes than this */
  threshold?: number;
  /** The account's own proposal that's still pending or being voted on; the governor allows one */
  liveProposal?: { id: number; state: 'pending' | 'active' };
  refresh: () => void;
}

/** Whether an account can propose right now, checked the way the governor's `propose` checks it. */
export const useProposerEligibility = (account: string | undefined): ProposerEligibility => {
  const [state, setState] = useState<Omit<ProposerEligibility, 'refresh'>>({ loading: false });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    if (!account) {
      setState({ loading: false });
      return;
    }
    let active = true;
    setState(s => ({ ...s, loading: true }));
    const provider = getReadProvider();
    const governor = new Contract(config.addresses.alpsDAOProxy, GOVERNOR_ABI, provider);
    const token = new Contract(config.addresses.alpsToken, TOKEN_ABI, provider);

    (async () => {
      const [votes, threshold, latestId] = await Promise.all([
        token.getCurrentVotes(account).catch(() => undefined),
        governor.proposalThreshold().catch(() => undefined),
        governor.latestProposalIds(account).catch(() => undefined),
      ]);
      let liveProposal: ProposerEligibility['liveProposal'];
      if (latestId && !BigNumber.from(latestId).isZero()) {
        const proposalState = await governor.state(latestId).catch(() => undefined);
        if (proposalState === PENDING || proposalState === ACTIVE) {
          liveProposal = {
            id: BigNumber.from(latestId).toNumber(),
            state: proposalState === PENDING ? 'pending' : 'active',
          };
        }
      }
      if (!active) return;
      setState({
        loading: false,
        votes: votes !== undefined ? BigNumber.from(votes).toNumber() : undefined,
        threshold: threshold !== undefined ? BigNumber.from(threshold).toNumber() : undefined,
        liveProposal,
      });
    })();

    return () => {
      active = false;
    };
  }, [account, nonce]);

  return { ...state, refresh };
};
