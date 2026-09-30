import { useQuery } from '@apollo/client';
import React from 'react';
import { Image } from 'react-bootstrap';
import _LinkIcon from '../../assets/icons/Link.svg';
import { auctionQuery } from '../../wrappers/subgraph';
import _HeartIcon from '../../assets/icons/Heart.svg';
import classes from './AlpInfoRowHolder.module.css';
import { buildEtherscanAddressLink } from '../../utils/etherscan';
import ShortAddress from '../ShortAddress';
import AlpInfoRow from '../AlpInfoRow';
import { useAppSelector } from '../../hooks';
import { Trans } from '@lingui/macro';

interface AlpInfoRowHolderProps {
  alpId: number;
}

const WARMING_HUT_ADDRESS = '0x3A83B519F8aE5A360466D4AF2Fa3c456f92AF1EC';
const WARMING_HUT_LINK = `https://etherscan.io/token/0xf59eb3e1957f120f7c135792830f900685536f52?a=${WARMING_HUT_ADDRESS}#inventory`;

/** Who won the Alp at auction, or where it went when nobody bid */
const AlpInfoRowHolder: React.FC<AlpInfoRowHolderProps> = ({ alpId }) => {
  const isCool = useAppSelector(state => state.application.isCoolBackground);
  const { loading, error, data } = useQuery(auctionQuery(alpId));

  const bidder: string | undefined = data?.auction.bidder?.id;
  const winner = bidder || WARMING_HUT_ADDRESS;
  const winnerLink = bidder ? buildEtherscanAddressLink(bidder) : WARMING_HUT_LINK;
  const label = bidder ? <Trans>Won by</Trans> : <Trans>Went to</Trans>;

  if (error) {
    return (
      <div>
        <Trans>Failed to fetch Alp info</Trans>
      </div>
    );
  }

  return (
    <AlpInfoRow icon={_HeartIcon} label={label}>
      {loading ? (
        <span className={classes.loading}>
          <Trans>Loading...</Trans>
        </span>
      ) : (
        <a
          className={classes.link}
          href={winnerLink}
          target="_blank"
          rel="noreferrer"
          title="View on Etherscan"
        >
          <ShortAddress address={winner} avatar={true} size={20} />
          <Image
            src={_LinkIcon}
            className={classes.linkIcon}
            style={{ filter: isCool ? '' : 'brightness(0) invert(1)' }}
          />
        </a>
      )}
    </AlpInfoRow>
  );
};

export default AlpInfoRowHolder;
