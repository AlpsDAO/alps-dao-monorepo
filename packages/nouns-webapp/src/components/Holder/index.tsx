import { Row, Col } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';
import classes from './Holder.module.css';
import ShortAddress from '../ShortAddress';
import clsx from 'clsx';
import { Trans } from '@lingui/macro';
import { useQuery } from '@apollo/client';
import { alpQuery } from '../../wrappers/subgraph';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import React from 'react';
import Tooltip from '../Tooltip';

interface HolderProps {
  alpId: number;
  isAlpers?: boolean;
}

const Holder: React.FC<HolderProps> = props => {
  const { alpId, isAlpers } = props;

  const isCool = useAppSelector(state => state.application.isCoolBackground);

  const { loading, error, data } = useQuery(alpQuery(alpId.toString()));

  if (loading) {
    return <></>;
  } else if (error) {
    return (
      <div>
        <Trans>Failed to fetch Alp info</Trans>
      </div>
    );
  }

  const holder = data && data.alp.owner.id;

  const nonAlperAlpContent = (
    <a
      href={buildEtherscanAddressLink(holder)}
      target={'_blank'}
      rel="noreferrer"
      className={classes.link}
    >
      <Tooltip
        tip="View on Etherscan"
        tooltipContent={(tip: string) => {
          return <Trans>View on Etherscan</Trans>;
        }}
        id="holder-etherscan-tooltip"
      >
        <span
          style={{
            color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
          }}
        >
          <ShortAddress size={40} address={holder} avatar={true} />
        </span>
      </Tooltip>
    </a>
  );

  const alperAlpContent = 'founders';

  return (
    <>
      <Row className={clsx(classes.wrapper, classes.section)}>
        <Col xs={1} lg={12} className={classes.leftCol}>
          <h4
            style={{
              color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
            }}
            className={classes.holderCopy}
          >
            <Trans>Held by</Trans>
          </h4>
        </Col>
        <Col xs="auto" lg={12}>
          <h2
            className={classes.holderContent}
            style={{
              color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
            }}
          >
            {isAlpers ? alperAlpContent : nonAlperAlpContent}
          </h2>
        </Col>
      </Row>
    </>
  );
};

export default Holder;
