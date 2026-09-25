import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ProposalStatus from '../ProposalStatus';
import classes from './ProposalHeader.module.css';
import navBarButtonClasses from '../NavBarButton/NavBarButton.module.css';
import { Proposal, useHasVotedOnProposal } from '../../wrappers/alpsDao';
import clsx from 'clsx';
import { isMobileScreen } from '../../utils/isMobile';
import { useUserVotesAsOfBlock } from '../../wrappers/alpToken';
import { Trans } from '@lingui/macro';
import { i18n } from '@lingui/core';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import { transactionLink } from '../ProposalContent';
import ShortAddress from '../ShortAddress';
import { useActiveLocale } from '../../hooks/useActivateLocale';
import { Locales } from '../../i18n/locales';
import HoverCard from '../HoverCard';
import ByLineHoverCard from '../ByLineHoverCard';

interface ProposalHeaderProps {
  proposal: Proposal;
  isActiveForVoting?: boolean;
  isWalletConnected: boolean;
  // The connected account's vote as seen live on the page, ahead of the receipt fetched on load
  userVote?: { support: 0 | 1 | 2 };
  submitButtonClickHandler: () => void;
}

const ProposalHeader: React.FC<ProposalHeaderProps> = props => {
  const { proposal, isActiveForVoting, isWalletConnected, userVote, submitButtonClickHandler } =
    props;

  const isMobile = isMobileScreen();
  const availableVotes = useUserVotesAsOfBlock(proposal?.createdBlock) ?? 0;
  const hasVoted = useHasVotedOnProposal(proposal?.id) || !!userVote;
  const disableVoteButton = !isWalletConnected || !availableVotes || hasVoted;
  const activeLocale = useActiveLocale();

  const voteButton = (
    <>
      {isWalletConnected ? (
        <>
          {!availableVotes && (
            <div className={classes.noVotesText}>
              <Trans>You have no votes.</Trans>
            </div>
          )}
        </>
      ) : (
        <div className={classes.connectWalletText}>
          <Trans>Connect a wallet to vote.</Trans>
        </div>
      )}
      <Button
        className={disableVoteButton ? classes.submitBtnDisabled : classes.submitBtn}
        disabled={disableVoteButton}
        onClick={submitButtonClickHandler}
      >
        <Trans>Submit vote</Trans>
      </Button>
    </>
  );

  const proposer = (
    <a
      href={buildEtherscanAddressLink(proposal.proposer || '')}
      target="_blank"
      rel="noreferrer"
      className={classes.proposerLinkJp}
    >
      <ShortAddress address={proposal.proposer || ''} avatar={false} />
    </a>
  );

  const proposedAtTransactionHash = (
    <Trans>
      at{' '}
      <span className={classes.propTransactionHash}>
        {transactionLink(proposal.transactionHash)}
      </span>
    </Trans>
  );

  return (
    <>
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex justify-content-start align-items-start">
          <Link to={'/vote'}>
            <button className={clsx(classes.backButton, navBarButtonClasses.whiteInfo)}>←</button>
          </Link>
          <div className={classes.headerRow}>
            <span>
              <div className="d-flex">
                <div>
                  <Trans>Proposal {i18n.number(parseInt(proposal.id || '0'))}</Trans>
                </div>
                <div>
                  <ProposalStatus status={proposal?.status} className={classes.proposalStatus} />
                </div>
              </div>
            </span>
            <div className={classes.proposalTitleWrapper}>
              <div className={classes.proposalTitle}>
                <h1>{proposal.title} </h1>
              </div>
            </div>
          </div>
        </div>
        {!isMobile && (
          <div className="d-flex justify-content-end align-items-end">
            {isActiveForVoting && voteButton}
          </div>
        )}
      </div>

      <div className={classes.byLineWrapper}>
        {activeLocale === Locales.ja_JP ? (
          <HoverCard
            hoverCardContent={(tip: string) => <ByLineHoverCard proposerAddress={tip} />}
            tip={proposal && proposal.proposer ? proposal.proposer : ''}
            id="byLineHoverCard"
          >
            <div className={classes.proposalByLineWrapperJp}>
              <Trans>
                <span className={classes.proposedByJp}>Proposed by: </span>
                <span className={classes.proposerJp}>{proposer}</span>
                <span className={classes.propTransactionWrapperJp}>
                  {proposedAtTransactionHash}
                </span>
              </Trans>
            </div>
          </HoverCard>
        ) : (
          <>
            <h3>Proposed by</h3>

            <div className={classes.byLineContentWrapper}>
              <HoverCard
                hoverCardContent={(tip: string) => <ByLineHoverCard proposerAddress={tip} />}
                tip={proposal && proposal.proposer ? proposal.proposer : ''}
                id="byLineHoverCard"
              >
                <h3>
                  {proposer}
                  <span className={classes.propTransactionWrapper}>
                    {proposedAtTransactionHash}
                  </span>
                </h3>
              </HoverCard>
            </div>
          </>
        )}
      </div>

    </>
  );
};

export default ProposalHeader;
