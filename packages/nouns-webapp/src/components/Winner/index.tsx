import { Button, Row, Col } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';
import classes from './Winner.module.css';
import ShortAddress from '../ShortAddress';
import clsx from 'clsx';
import { isMobileScreen } from '../../utils/isMobile';
import { Trans } from '@lingui/macro';
import { useActiveLocale } from '../../hooks/useActivateLocale';
import React from 'react';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import Tooltip from '../Tooltip';

interface WinnerProps {
  winner: string;
  isAlpers?: boolean;
  isAlpsCouncil?: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'; // Ethereum's zero address
const WARMING_HUT_ENS = 'warminghut.eth'; // ENS to display when no bids were placed

const Winner: React.FC<WinnerProps> = props => {
  const { winner, isAlpers, isAlpsCouncil } = props;
  const activeAccount = useAppSelector(state => state.account.activeAccount);
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const isMobile = isMobileScreen();
  const activeLocale = useActiveLocale();

  // Use Warming Hut ENS if the winner is the zero address
  const displayWinner = winner.toLowerCase() === ZERO_ADDRESS ? WARMING_HUT_ENS : winner;

  const isWinnerYou =
    activeAccount !== undefined && activeAccount.toLocaleLowerCase() === winner.toLocaleLowerCase();

  const nonAlperAlpContent = isWinnerYou ? (
    <Row className={classes.youSection}>
      <Col lg={activeLocale === 'ja-JP' ? 8 : 4} className={classes.youCopy}>
        <h2
          className={classes.winnerContent}
          style={{
            color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
          }}
        >
          <Trans>You</Trans>
        </h2>
      </Col>
      {!isMobile && (
        // <Col>
        //   <a
        //     href="https://alps.center/alpers"
        //     target="_blank"
        //     rel="noreferrer noopener"
        //     className={classes.verifyLink}
        //   >
        //     <Button className={classes.verifyButton}>
        //       <Trans>What now?</Trans>
        //     </Button>
        //   </a>
        // </Col>
        <></>
      )}
    </Row>
  ) : (
    <ShortAddress size={40} address={displayWinner} avatar={true} />
  );

  const alperAlpContent = (
    <a
      href={buildEtherscanAddressLink('0x7f0fB27A2673AdC49D583AEB6e5f799E7D7dc16F')}
      target={'_blank'}
      rel="noreferrer"
      className={classes.link}
      style={{
        color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
      }}
    >
      <Tooltip
        tip="View on Etherscan"
        tooltipContent={(tip: string) => {
          return <Trans>View on Etherscan</Trans>;
        }}
        id="holder-etherscan-tooltip"
      >
        Founders
      </Tooltip>
    </a>
  );

  const alpsCouncilContent = (
    <a
      href={buildEtherscanAddressLink('0x6F895beCD7bf90A5C7d1766a1EcA13b1d087dE05')}
      target={'_blank'}
      rel="noreferrer"
      className={classes.link}
      style={{
        color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
      }}
    >
      <Tooltip
        tip="View on Etherscan"
        tooltipContent={(tip: string) => {
          return <Trans>View on Etherscan</Trans>;
        }}
        id="holder-etherscan-tooltip"
      >
        Alpine Council
      </Tooltip>
    </a>
  );

  return (
    <>
      <Row className={clsx(classes.wrapper, classes.section)}>
        <Col xs={1} lg={12} className={classes.leftCol}>
          <h4
            style={{
              color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
            }}
            className={classes.winnerCopy}
          >
            <Trans>Winner</Trans>
          </h4>
        </Col>
        <Col xs="auto" lg={12}>
          <h2
            className={classes.winnerContent}
            style={{
              color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
            }}
          >
            {isAlpers ? alperAlpContent : nonAlperAlpContent}
            {isAlpsCouncil ? alpsCouncilContent : null}
          </h2>
        </Col>
      </Row>
      {/* {isWinnerYou && isMobile && (
        <Row>
          <a
            href="https://alps.center/alpers"
            target="_blank"
            rel="noreferrer noopener"
            className={classes.verifyLink}
          >
            <Button className={classes.verifyButton}>
              <Trans>What now?</Trans>
            </Button>
          </a>
        </Row>
      )} */}
    </>
  );
};

export default Winner;
