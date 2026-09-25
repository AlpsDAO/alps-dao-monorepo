import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { constants } from 'ethers';
import { Trans } from '@lingui/macro';
import { Auction } from '../../wrappers/alpsAuction';
import { nextRewardAlp } from '../../utils/alperAlp';
import ShortAddress from '../ShortAddress';
import classes from './KickOffAuction.module.css';

/**
 * Shown once an auction has ended and nobody has settled it yet. Settling sends the ended auction's
 * Alp on its way and mints the next one, so this is what restarts auctions after a quiet spell.
 */
const KickOffAuction: React.FC<{
  auction: Auction;
  pending: boolean;
  onKickOff: () => void;
}> = ({ auction, pending, onKickOff }) => {
  const alpId = auction.alpId.toNumber();
  const hasWinner = auction.bidder !== constants.AddressZero && !auction.amount.isZero();
  const reward = nextRewardAlp(auction.alpId);
  const nextAuctionAlpId = (reward ? reward.alpId.add(1) : auction.alpId.add(1)).toNumber();

  return (
    <div className={classes.kickOff}>
      <Button className={classes.kickOffBtn} onClick={onKickOff} disabled={pending}>
        {pending ? <Spinner animation="border" size="sm" /> : <Trans>Kick off the next auction</Trans>}
      </Button>
      <p className={classes.explainer}>
        {hasWinner ? (
          <Trans>
            This sends Alp {alpId} to its winner, <ShortAddress address={auction.bidder} />, and mints
            Alp {nextAuctionAlpId} for a new 3-hour auction.
          </Trans>
        ) : (
          <Trans>
            Nobody bid on Alp {alpId}, so this sends it to the Warming Hut and mints Alp{' '}
            {nextAuctionAlpId} for a new 3-hour auction.
          </Trans>
        )}{' '}
        {reward?.recipient === 'founders' && (
          <Trans>It also mints Alp {reward.alpId.toNumber()} for the founders.</Trans>
        )}
        {reward?.recipient === 'council' && (
          <Trans>It also mints Alp {reward.alpId.toNumber()} for the Alpine Council.</Trans>
        )}{' '}
        <Trans>
          The Alp beside this one is what it mints right now. Its traits come from the latest block,
          so it changes with every new block, about every 12 seconds: kick off before the bar runs out
          (leave a few seconds for your transaction to make the next block) and that’s the Alp you’ll
          mint. Anyone can kick off the next auction; it only costs gas.
        </Trans>
      </p>
    </div>
  );
};

export default KickOffAuction;
