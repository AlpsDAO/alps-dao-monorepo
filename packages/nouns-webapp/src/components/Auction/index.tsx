import { Col } from 'react-bootstrap';
import { StandaloneAlpWithSeed } from '../StandaloneAlp';
import AuctionActivity from '../AuctionActivity';
import { Row, Container } from 'react-bootstrap';
import { setStateBackgroundColor } from '../../state/slices/application';
import { LoadingAlp } from '../Alp';
import { Auction as IAuction } from '../../wrappers/alpsAuction';
import classes from './Auction.module.css';
import { IAlpSeed } from '../../wrappers/alpToken';
import AlperAlpContent from '../AlperAlpContent';
import { useHistory } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { isAlperAlp, isAlpsCouncil } from '../../utils/alperAlp';
import {
  setNextOnDisplayAuctionAlpId,
  setPrevOnDisplayAuctionAlpId,
} from '../../state/slices/onDisplayAuction';
import { beige } from '../../utils/alpBgColors';

interface AuctionProps {
  auction?: IAuction;
}

const Auction: React.FC<AuctionProps> = props => {
  const { auction: currentAuction } = props;

  const history = useHistory();
  const dispatch = useAppDispatch();
  let stateBgColor = useAppSelector(state => state.application.stateBackgroundColor);
  const lastAlpId = useAppSelector(state => state.onDisplayAuction.lastAuctionAlpId);

  const loadedAlpHandler = (seed: IAlpSeed) => {
    const backgroundColors = [
      '#63a0f9',
      '#018146',
      '#000000',
      '#76858b',
      '#f8d689',
      '#d5d7e1',
      '#e1d7d5',
    ];
    dispatch(setStateBackgroundColor(backgroundColors[seed.background] ?? beige));
  };

  const prevAuctionHandler = () => {
    dispatch(setPrevOnDisplayAuctionAlpId());
    currentAuction && history.push(`/alp/${currentAuction.alpId.toNumber() - 1}`);
  };
  const nextAuctionHandler = () => {
    dispatch(setNextOnDisplayAuctionAlpId());
    currentAuction && history.push(`/alp/${currentAuction.alpId.toNumber() + 1}`);
  };

  const alpContent = currentAuction && (
    <div className={classes.alpWrapper}>
      <StandaloneAlpWithSeed
        alpId={currentAuction.alpId}
        onLoadSeed={loadedAlpHandler}
        shouldLinkToProfile={false}
      />
    </div>
  );

  const loadingAlp = (
    <div className={classes.alpWrapper}>
      <LoadingAlp />
    </div>
  );

  const currentAuctionActivityContent = currentAuction && lastAlpId && (
    <AuctionActivity
      auction={currentAuction}
      isFirstAuction={currentAuction.alpId.eq(0)}
      isLastAuction={currentAuction.alpId.eq(lastAlpId)}
      onPrevAuctionClick={prevAuctionHandler}
      onNextAuctionClick={nextAuctionHandler}
      displayGraphDepComps={true}
    />
  );
  const alperAlpContent = currentAuction && lastAlpId && (
    <AlperAlpContent
      mintTimestamp={currentAuction.startTime}
      alpId={currentAuction.alpId}
      isFirstAuction={currentAuction.alpId.eq(0)}
      isLastAuction={currentAuction.alpId.eq(lastAlpId)}
      onPrevAuctionClick={prevAuctionHandler}
      onNextAuctionClick={nextAuctionHandler}
    />
  );

  return (
    <div style={{ backgroundColor: stateBgColor }} className={classes.wrapper}>
      <Container fluid="xl">
        <Row>
          <Col lg={{ span: 6 }} className={classes.alpContentCol}>
            {currentAuction ? alpContent : loadingAlp}
          </Col>
          <Col lg={{ span: 6 }} className={classes.auctionActivityCol}>
            {currentAuction &&
              (isAlperAlp(currentAuction.alpId) || isAlpsCouncil(currentAuction.alpId)
                ? alperAlpContent
                : currentAuctionActivityContent)}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Auction;
