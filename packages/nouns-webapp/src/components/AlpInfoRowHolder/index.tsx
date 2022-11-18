import { useQuery } from '@apollo/client';
import React from 'react';
import { Image } from 'react-bootstrap';
import _LinkIcon from '../../assets/icons/Link.svg';
import { auctionQuery } from '../../wrappers/subgraph';
import _HeartIcon from '../../assets/icons/Heart.svg';
import classes from './AlpInfoRowHolder.module.css';

import config from '../../config';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import ShortAddress from '../ShortAddress';

import { useAppSelector } from '../../hooks';
import { Trans } from '@lingui/macro';
import Tooltip from '../Tooltip';

interface AlpInfoRowHolderProps {
  alpId: number;
}

const AlpInfoRowHolder: React.FC<AlpInfoRowHolderProps> = props => {
  const { alpId } = props;
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const { loading, error, data } = useQuery(auctionQuery(alpId));

  const winner = data && data.auction.bidder?.id;

  if (loading || !winner) {
    return (
      <div className={classes.alpHolderInfoContainer}>
        <span className={classes.alpHolderLoading}>
          <Trans>Loading...</Trans>
        </span>
      </div>
    );
  } else if (error) {
    return (
      <div>
        <Trans>Failed to fetch Alp info</Trans>
      </div>
    );
  }

  const etherscanURL = buildEtherscanAddressLink(winner);
  const shortAddressComponent = <ShortAddress address={winner} />;

  return (
    <Tooltip
      tip="View on Etherscan"
      tooltipContent={(tip: string) => {
        return <Trans>View on Etherscan</Trans>;
      }}
      id="holder-etherscan-tooltip"
    >
      <div className={classes.alpHolderInfoContainer}>
        <span>
          <Image
            src={_HeartIcon}
            className={classes.heartIcon}
            style={{ filter: isCool ? '' : 'brightness(0) invert(1)' }}
          />
        </span>
        <span
          style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}
          className={classes.mobileText}
        >
          <Trans>Winner</Trans>
        </span>
        <span>
          <a
            className={
              isCool ? classes.alpHolderEtherscanLinkCool : classes.alpHolderEtherscanLinkWarm
            }
            href={etherscanURL}
            target={'_blank'}
            rel="noreferrer"
          >
            {winner.toLowerCase() === config.addresses.alpsAuctionHouseProxy.toLowerCase() ? (
              <Trans>Alps Auction House</Trans>
            ) : (
              shortAddressComponent
            )}
            <span className={classes.linkIconSpan}>
              <Image src={_LinkIcon} className={classes.linkIcon} />
            </span>
          </a>
        </span>
      </div>
    </Tooltip>
  );
};

export default AlpInfoRowHolder;
