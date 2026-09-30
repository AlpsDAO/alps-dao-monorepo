import React from 'react';
import { Col, Row, Spinner } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import { processProposalDescriptionText } from '../../utils/processProposalDescriptionText';
import { Proposal } from '../../wrappers/alpsDao';
import remarkBreaks from 'remark-breaks';
import { buildEtherscanAddressLink, buildEtherscanTxLink } from '../../utils/etherscan';
import { utils } from 'ethers';
import classes from './ProposalContent.module.css';
import { Trans } from '@lingui/macro';
import EnsOrLongAddress from '../EnsOrLongAddress';
import { ProposalActionCard } from '../ProposalActionSummary';
import { useProposalActions } from '../../hooks/useProposalActions';

interface ProposalContentProps {
  proposal?: Proposal;
}

export const linkIfAddress = (content: string) => {
  if (utils.isAddress(content)) {
    return (
      <a href={buildEtherscanAddressLink(content)} target="_blank" rel="noreferrer">
        <EnsOrLongAddress address={content} />
      </a>
    );
  }
  return <span>{content}</span>;
};

export const transactionLink = (content: string) => {
  return (
    <a href={buildEtherscanTxLink(content)} target="_blank" rel="noreferrer">
      {content.substring(0, 7)}
    </a>
  );
};

export const ProposalDescription: React.FC<ProposalContentProps> = ({ proposal }) => (
  <>
    {proposal?.description && (
      <ReactMarkdown
        className={classes.markdown}
        children={processProposalDescriptionText(proposal.description, proposal.title)}
        remarkPlugins={[remarkBreaks]}
      />
    )}
  </>
);

/**
 * The proposal's actions in plain words, each with its exact target, value, signature and calldata
 * a click away. Raw calldata (no signature) is shown as such, never as a plain transfer.
 */
export const ProposalTransactions: React.FC<ProposalContentProps> = ({ proposal }) => {
  const { txs, failed } = useProposalActions(proposal?.id);
  if (!txs) {
    return failed ? (
      <p className={classes.actionsNote}>
        <Trans>Couldn't load this proposal's actions.</Trans>
      </p>
    ) : (
      <Spinner animation="border" size="sm" />
    );
  }
  return (
    <div className={classes.transactions}>
      {txs.map((tx, i) => (
        <ProposalActionCard key={i} index={i} tx={tx} />
      ))}
    </div>
  );
};

const ProposalContent: React.FC<ProposalContentProps> = props => {
  return (
    <>
      <Row>
        <Col className={classes.section}>
          <h5>
            <Trans>Description</Trans>
          </h5>
          <ProposalDescription {...props} />
        </Col>
      </Row>
      <Row>
        <Col className={classes.section}>
          <h5>
            <Trans>Proposed Transactions</Trans>
          </h5>
          <ProposalTransactions {...props} />
        </Col>
      </Row>
    </>
  );
};

export default ProposalContent;
