import React from 'react';
import { Trans } from '@lingui/macro';
import { useWalletFlags } from '../../utils/moderation/flagged';
import classes from './ProposalTitle.module.css';

/** A proposal's title, or a neutral one when its proposer is flagged: their words stay hidden by default */
const ProposalTitle: React.FC<{ proposal: { title: string; proposer?: string } }> = ({
  proposal,
}) => {
  const walletFlag = useWalletFlags();
  return walletFlag(proposal.proposer) ? (
    <span className={classes.flagged}>
      <Trans>Flagged proposal</Trans>
    </span>
  ) : (
    <>{proposal.title}</>
  );
};

export default ProposalTitle;
