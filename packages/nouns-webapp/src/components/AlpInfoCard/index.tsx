import React from 'react';
import { Col } from 'react-bootstrap';

import classes from './AlpInfoCard.module.css';

import _AddressIcon from '../../assets/icons/Address.svg';
import _BidsIcon from '../../assets/icons/Bids.svg';

import AlpInfoRowBirthday from '../AlpInfoRowBirthday';
import AlpInfoRowHolder from '../AlpInfoRowHolder';
import AlpInfoRowButton from '../AlpInfoRowButton';
import { useAppSelector } from '../../hooks';

import config from '../../config';
import { buildEtherscanTokenLink } from '../../utils/etherscan';
import { Trans } from '@lingui/macro';

interface AlpInfoCardProps {
  alpId: number;
  bidHistoryOnClickHandler: () => void;
}

const AlpInfoCard: React.FC<AlpInfoCardProps> = props => {
  const { alpId, bidHistoryOnClickHandler } = props;

  const etherscanButtonClickHandler = () =>
    window.open(buildEtherscanTokenLink(config.addresses.alpsToken, alpId));

  const lastAuctionAlpId = useAppSelector(state => state.onDisplayAuction.lastAuctionAlpId);

  return (
    <>
      <Col lg={12} className={classes.alpInfoRow}>
        <AlpInfoRowBirthday alpId={alpId} />
      </Col>
      <Col lg={12} className={classes.alpInfoRow}>
        <AlpInfoRowHolder alpId={alpId} />
      </Col>
      <Col lg={12} className={classes.alpInfoRow}>
        <AlpInfoRowButton
          iconImgSource={_BidsIcon}
          btnText={lastAuctionAlpId === alpId ? <Trans>Bids</Trans> : <Trans>Bid history</Trans>}
          onClickHandler={bidHistoryOnClickHandler}
        />
        <AlpInfoRowButton
          iconImgSource={_AddressIcon}
          btnText={<Trans>Etherscan</Trans>}
          onClickHandler={etherscanButtonClickHandler}
        />
      </Col>
    </>
  );
};

export default AlpInfoCard;
