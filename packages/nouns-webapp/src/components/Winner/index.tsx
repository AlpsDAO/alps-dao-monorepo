import { Button, Row, Col } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';
import classes from './Winner.module.css';
import ShortAddress from '../ShortAddress';
import clsx from 'clsx';
import { isMobileScreen } from '../../utils/isMobile';
import { Trans } from '@lingui/macro';
import { useActiveLocale } from '../../hooks/useActivateLocale';
import React from 'react';
import Tooltip from '../Tooltip';
import { buildEtherscanAddressLink } from '../../utils/etherscan';

interface WinnerProps {
  winner: string;
  isAlpers?: boolean;
  isAlpsCouncil?: boolean;
}

// Constants for zero address and Warming Hut fallback
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const WARMING_HUT_ENS = 'warminghut.eth';
const WARMING_HUT_ADDRESS = '0x3A83B519F8aE5A360466D4AF2Fa3c456f92AF1EC';
const WARMING_HUT_LINK = `https://etherscan.io/token/0xf59eb3e1957f120f7c135792830f900685536f52?a=${WARMING_HUT_ADDRESS}`;

const Winner: React.FC<WinnerProps> = props => {
  const { winner, isAlpers, isAlpsCouncil } = props;
  const activeAccount = useAppSelector(state => state.account.activeAccount);
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const isMobile = isMobileScreen();
  const activeLocale = useActiveLocale();

  // Determine displayed winner
  const displayWinner = winner.toLowerCase() === ZERO_ADDRESS ? WARMING_HUT_ENS : winner;
  const winnerLink = displayWinner === WARMING_HUT_ENS ? WARMING_HUT_LINK : buildEtherscanAddressLink(displayWinner);

  const isWinnerYou =
    activeAccount !== undefined &&
    activeAccount.toLocaleLowerCase() === winner.toLocaleLowerCase();

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
    <a href={winnerLink} target="_blank" rel="noreferrer noopener" className={classes.link}>
      <Tooltip
        tip="View on Etherscan"
        tooltipContent={(tip: string) => <Trans>View on Etherscan</Trans>}
        id="winner-etherscan-tooltip"
      >
        <span
          style={{
            color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
          }}
          className={classes.mobileText}
        >
          <ShortAddress size={40} address={displayWinner} avatar={true} />
        </span>
      </Tooltip>
    </a>
  );

  const alperAlpContent = (
    <a
      href={buildEtherscanAddressLink('0x7f0fB27A2673AdC49D583AEB6e5f799E7D7dc16F')}
      target="_blank"
      rel="noreferrer"
      className={classes.link}
      style={{
        color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
      }}
    >
      <Tooltip
        tip="View on Etherscan"
        tooltipContent={(tip: string) => <Trans>View on Etherscan</Trans>}
        id="holder-etherscan-tooltip"
      >
        Founders
      </Tooltip>
    </a>
  );

  const alpsCouncilContent = (
    <a
      href={buildEtherscanAddressLink('0x6F895beCD7bf90A5C7d1766a1EcA13b1d087dE05')}
      target="_blank"
      rel="noreferrer"
      className={classes.link}
      style={{
        color: isCool ? 'var(--brand-black)' : 'var(--brand-white)',
      }}
    >
      <Tooltip
        tip="View on Etherscan"
        tooltipContent={(tip: string) => <Trans>View on Etherscan</Trans>}
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
