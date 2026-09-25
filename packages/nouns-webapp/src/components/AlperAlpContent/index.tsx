import { Col, Row } from 'react-bootstrap';
import { BigNumber } from 'ethers';
import AuctionActivityWrapper from '../AuctionActivityWrapper';
import AuctionNavigation from '../AuctionNavigation';
import AuctionActivityAlpTitle from '../AuctionActivityAlpTitle';
import AuctionActivityDateHeadline from '../AuctionActivityDateHeadline';
import AuctionTitleAndNavWrapper from '../AuctionTitleAndNavWrapper';
import alpContentClasses from './AlperAlpContent.module.css';
import auctionBidClasses from '../AuctionActivity/BidHistory.module.css';
import auctionActivityClasses from '../AuctionActivity/AuctionActivity.module.css';
import CurrentBid, { BID_N_A } from '../CurrentBid';
import Winner from '../Winner';

import { useAppSelector } from '../../hooks';
import { useCallback, useEffect } from 'react';

const AlperAlpContent: React.FC<{
  mintTimestamp: BigNumber;
  alpId: BigNumber;
  isFirstAuction: boolean;
  isLastAuction: boolean;
  onPrevAuctionClick: () => void;
  onNextAuctionClick: () => void;
}> = props => {
  const {
    mintTimestamp,
    alpId,
    isFirstAuction,
    isLastAuction,
    onPrevAuctionClick,
    onNextAuctionClick,
  } = props;

  const isCool = useAppSelector(state => state.application.isCoolBackground);

  const alpIdNumber: number = alpId.toNumber();
  let block: any;
  let isAlperAlp = false;
  let isAlpsCouncil = false;

  if (alpIdNumber % 10 === 0) {
    isAlperAlp = true;
    isAlpsCouncil = false;

    block = (
      <ul className={auctionBidClasses.bidCollection}>
        <li
          className={
            (isCool ? `${auctionBidClasses.bidRowCool}` : `${auctionBidClasses.bidRowWarm}`) +
            ` ${alpContentClasses.bidRow}`
          }
        >
          <span
            style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}
            className={alpContentClasses.mobileText}
          >
            <p>
              This Alp went straight to the founders instead of being auctioned. All auction
              proceeds go to the club treasury, so until Alp #14,600 every 10th Alp (#0, #10, #20
              and so on) is minted to the founders’ multisig as their reward for building and
              running Alps.
            </p>
          </span>
        </li>
      </ul>
    );
  } else if (alpIdNumber % 5 === 0) {
    isAlperAlp = false;
    isAlpsCouncil = true;

    block = (
      <ul className={auctionBidClasses.bidCollection}>
        <li
          className={
            (isCool ? `${auctionBidClasses.bidRowCool}` : `${auctionBidClasses.bidRowWarm}`) +
            ` ${alpContentClasses.bidRow}`
          }
        >
          <span
            style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}
            className={alpContentClasses.mobileText}
          >
            <p>
              This Alp went straight to the Alpine Council instead of being auctioned. Until Alp
              #14,600, every Alp ending in 5 (#5, #15, #25 and so on) is minted to the Council’s
              multisig, and Council members decide together how to vote with them.
            </p>
          </span>
        </li>
      </ul>
    );
  }

  // Page through Alps via keyboard
  // handle what happens on key press
  const handleKeyPress = useCallback(
    event => {
      console.log(event);
      if (event.key === 'ArrowLeft') {
        onPrevAuctionClick();
      }
      if (event.key === 'ArrowRight') {
        onNextAuctionClick();
      }
    },
    [onNextAuctionClick, onPrevAuctionClick],
  );

  useEffect(() => {
    // attach the event listener
    document.addEventListener('keydown', handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <AuctionActivityWrapper>
      <div className={auctionActivityClasses.informationRow}>
        <Row className={auctionActivityClasses.activityRow}>
          <AuctionTitleAndNavWrapper>
            <AuctionNavigation
              isFirstAuction={isFirstAuction}
              isLastAuction={isLastAuction}
              onNextAuctionClick={onNextAuctionClick}
              onPrevAuctionClick={onPrevAuctionClick}
            />
            <AuctionActivityDateHeadline startTime={mintTimestamp} />
          </AuctionTitleAndNavWrapper>
          <Col lg={12}>
            <AuctionActivityAlpTitle alpId={alpId} />
          </Col>
        </Row>
        <Row className={auctionActivityClasses.activityRow}>
          <Col lg={4} className={auctionActivityClasses.currentBidCol}>
            <CurrentBid currentBid={BID_N_A} auctionEnded={true} />
          </Col>
          <Col
            lg={5}
            className={`${auctionActivityClasses.currentBidCol} ${alpContentClasses.currentBidCol} ${auctionActivityClasses.auctionTimerCol}`}
          >
            <div className={auctionActivityClasses.section}>
              <Winner winner={''} isAlpers={isAlperAlp} isAlpsCouncil={isAlpsCouncil} />
            </div>
          </Col>
        </Row>
      </div>
      <Row className={auctionActivityClasses.activityRow}>
        <Col lg={12}>
          {block}
        </Col>
      </Row>
    </AuctionActivityWrapper>
  );
};
export default AlperAlpContent;
