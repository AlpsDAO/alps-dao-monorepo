import { useQuery } from '@apollo/client';
import React from 'react';
import { Image } from 'react-bootstrap';
import _LinkIcon from '../../assets/icons/Link.svg';
import { auctionQuery } from '../../wrappers/subgraph';
import _HeartIcon from '../../assets/icons/Heart.svg';
import classes from './AlpInfoRowHolder.module.css';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import ShortAddress from '../ShortAddress';
import { useAppSelector } from '../../hooks';
import { Trans } from '@lingui/macro';
import Tooltip from '../Tooltip';

interface AlpInfoRowHolderProps {
  alpId: number;
}

const WARMING_HUT_ADDRESS = '0x3A83B519F8aE5A360466D4AF2Fa3c456f92AF1EC';
const WARMING_HUT_LINK = `https://etherscan.io/token/0xf59eb3e1957f120f7c135792830f900685536f52?a=${WARMING_HUT_ADDRESS}#inventory`;

const AlpInfoRowHolder: React.FC<AlpInfoRowHolderProps> = ({ alpId }) => {
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const { loading, error, data } = useQuery(auctionQuery(alpId));

  // Use Warming Hut address if there is no bidder
  const winner = data?.auction.bidder?.id || WARMING_HUT_ADDRESS;
  const winnerLink =
    winner === WARMING_HUT_ADDRESS ? WARMING_HUT_LINK : buildEtherscanAddressLink(winner);

  if (loading) {
    return (
      <div className={classes.alpHolderInfoContainer}>
        <span className={classes.alpHolderLoading}>
          <Trans>Loading...</Trans>
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Trans>Failed to fetch Alp info</Trans>
      </div>
    );
  }

  return (
    <Tooltip
      tip="View on Etherscan"
      tooltipContent={() => <Trans>View on Etherscan</Trans>}
      id="holder-etherscan-tooltip"
    >
      <div className={classes.alpHolderInfoContainer}>
        <Image
          src={_HeartIcon}
          className={classes.heartIcon}
          style={{ filter: isCool ? '' : 'brightness(0) invert(1)' }}
        />
        <span
          style={{ color: isCool ? 'var(--brand-black)' : 'var(--brand-white)' }}
          className={classes.mobileText}
        >
          <Trans>Winner</Trans>
        </span>
        <a
          className={
            isCool ? classes.alpHolderEtherscanLinkCool : classes.alpHolderEtherscanLinkWarm
          }
          href={winnerLink}
          target="_blank"
          rel="noreferrer"
        >
          <ShortAddress address={winner} avatar={true} />
          <span className={classes.linkIconSpan}>
            <Image src={_LinkIcon} className={classes.linkIcon} />
          </span>
        </a>
      </div>
    </Tooltip>
  );
};

export default AlpInfoRowHolder;
